/**
 * كل نقاط الـ API الخاصة بموقع «قطاعتي».
 *
 * المتصفح لا يتحدث مع صفقة إطلاقًا — يتحدث مع هذه النقاط فقط،
 * وهي التي تنادي صفقة بالمفتاح السرّي المحفوظ على السيرفر.
 *
 * هذا الراوتر يُستخدم في وضعين:
 *   • أثناء التطوير: كـ middleware داخل سيرفر Vite (راجع vite.config.ts).
 *   • في الإنتاج: مركّب داخل express (راجع server/index.ts).
 */
import express, { type Request, type Response, type Router } from "express";
import fs from "node:fs";
import {
  EVENTS_LOG_FILE,
  IS_SERVERLESS,
  ORDERS_LOG_FILE,
  config,
  getApiKey,
  readStoredKey,
  writeStoredKey,
} from "./config.js";
import { FALLBACK_GOVERNORATES } from "./fallback-shipping.js";
import {
  HAS_KV,
  STATUS_MAP,
  describeStatus,
  findOrderStatus,
  saveOrderStatus,
  updateOrderStatus,
} from "./order-store.js";
import {
  SafkaError,
  clearSafkaCache,
  createOrder,
  fetchPriceList,
  fetchProduct,
  type SafkaProduct,
  type SafkaProperty,
} from "./safka.js";

// ---------------------------------------------------------------------------
// أدوات مساعدة
// ---------------------------------------------------------------------------

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

/** يحوّل الأرقام العربية/الفارسية إلى لاتينية حتى يقبلها الـ API. */
function normalizeDigits(input: string) {
  return input.replace(ARABIC_DIGITS, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

function cleanPhone(input: unknown) {
  return normalizeDigits(String(input ?? "")).replace(/[\s\-()+]/g, "");
}

function isValidEgyptPhone(phone: string) {
  return /^01[0125]\d{8}$/.test(phone);
}

function text(input: unknown, max = 500) {
  return String(input ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function appendLine(file: string, payload: unknown) {
  try {
    fs.appendFileSync(file, `${JSON.stringify(payload)}\n`, "utf-8");
  } catch (error) {
    console.error(`[qataaty] failed writing ${file}:`, (error as Error).message);
  }
}

/**
 * نسخة احتياطية من الطلب خارج الملفات المحلية:
 *   • تُطبع دائمًا في سجلّات السيرفر (على Vercel تشوفها في Runtime Logs).
 *   • تُرسَل كمان لـ ORDERS_WEBHOOK_URL لو مضبوط (Google Sheets / Make / n8n).
 * ضروري على الاستضافات الـ serverless لأن نظام الملفات بيتمسح.
 */
async function backupOrder(record: unknown) {
  console.log(`[qataaty] ORDER ${JSON.stringify(record)}`);

  if (!config.ordersWebhookUrl) return;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    await fetch(config.ordersWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (error) {
    console.error("[qataaty] orders webhook failed:", (error as Error).message);
  }
}

function readLines<T>(file: string, limit = 200): T[] {
  try {
    if (!fs.existsSync(file)) return [];
    return fs
      .readFileSync(file, "utf-8")
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .reverse()
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

/** حدّ بسيط لمنع إغراق نقطة إنشاء الطلب. */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > max;
}

function clientIp(req: Request) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || "unknown";
}

// ---------------------------------------------------------------------------
// اختيار الخاصية (property) وحساب العمولة
// ---------------------------------------------------------------------------

/**
 * يختار الخاصية المطلوبة: المحددة في .env إن وُجدت، وإلا أول خاصية متاحة.
 * كل طلب على صفقة لازم يحمل property صالحة.
 */
function pickProperty(product: SafkaProduct): SafkaProperty | null {
  const list = Array.isArray(product.properties) ? product.properties : [];
  if (config.propertyId) {
    const exact = list.find((item) => item._id === config.propertyId);
    if (exact) return exact;
  }
  return list.find((item) => item.is_available !== false) ?? list[0] ?? null;
}

/** سعر المنتج عند صفقة (تكلفتك) — أساس حساب العمولة. */
function basePrice(product: SafkaProduct, property: SafkaProperty | null) {
  const fromProperty = Number(property?.sale_price);
  if (Number.isFinite(fromProperty) && fromProperty > 0) return fromProperty;
  const fromProduct = Number(product.sale_price);
  return Number.isFinite(fromProduct) && fromProduct > 0 ? fromProduct : 0;
}

/**
 * العمولة = (سعر بيعك للعميل − سعر المنتج عند صفقة) × الكمية.
 * مثال من توثيق صفقة: منتج بـ 180 و«سعر البيع المقترح 280 عمولتك 100».
 */
function commissionFor(product: SafkaProduct, property: SafkaProperty | null, qty: number) {
  if (config.fixedCommission !== null && Number.isFinite(config.fixedCommission)) {
    return Math.max(0, Math.round(config.fixedCommission * qty));
  }
  const base = basePrice(product, property);
  if (!base) return 0;
  return Math.max(0, Math.round((config.sellPrice - base) * qty));
}

// ---------------------------------------------------------------------------
// الراوتر
// ---------------------------------------------------------------------------

export function createApiRouter(): Router {
  const router = express.Router();
  router.use(express.json({ limit: "256kb" }));

  const requireAdmin = (req: Request, res: Response, next: () => void) => {
    if (!config.adminToken) {
      res.status(503).json({ success: false, error: "اضبط ADMIN_TOKEN في ملف .env أولًا." });
      return;
    }
    const provided = String(req.query.token || req.headers["x-admin-token"] || "");
    if (provided !== config.adminToken) {
      res.status(401).json({ success: false, error: "توكن الإدارة غير صحيح." });
      return;
    }
    next();
  };

  // -------------------------------------------------------------------------
  // صحة الخدمة
  // -------------------------------------------------------------------------
  router.get("/health", (_req, res) => {
    res.json({ ok: true, connected: Boolean(getApiKey()), time: new Date().toISOString() });
  });

  // -------------------------------------------------------------------------
  // بيانات المتجر: المنتج + السعر + حالة الربط
  // -------------------------------------------------------------------------
  router.get("/storefront", async (_req, res) => {
    const pricing = {
      sell: config.sellPrice,
      compareAt: config.compareAtPrice,
      save: Math.max(0, config.compareAtPrice - config.sellPrice),
      currency: "EGP",
      maxQty: config.maxQty,
    };

    if (!getApiKey()) {
      res.json({
        connected: false,
        source: "fallback",
        pricing,
        product: null,
        message: "الموقع غير مربوط بحساب صفقة بعد.",
      });
      return;
    }

    try {
      const product = await fetchProduct();
      const property = pickProperty(product);
      res.json({
        connected: true,
        source: "safka",
        pricing,
        product: {
          id: product._id,
          name: product.name,
          barcode: product.barcode ?? null,
          description: product.description ?? "",
          images: (product.images?.length ? product.images : [product.image]).filter(Boolean),
          faqs: (product.faqs ?? []).filter((faq) => faq.is_active !== false),
          propertyId: property?._id ?? null,
          propertyName: property?.key ?? null,
          inStock: product.is_active !== false && property?.is_available !== false,
        },
      });
    } catch (error) {
      const safka = error as SafkaError;
      console.error("[qataaty] storefront:", safka.message);
      res.json({
        connected: true,
        source: "error",
        pricing,
        product: null,
        message: safka.message,
      });
    }
  });

  // -------------------------------------------------------------------------
  // المحافظات والمدن وأسعار الشحن
  // -------------------------------------------------------------------------
  router.get("/shipping", async (_req, res) => {
    if (!getApiKey()) {
      res.json({
        source: "fallback",
        connected: false,
        governorates: FALLBACK_GOVERNORATES.map((row) => ({ ...row, cities: [] })),
      });
      return;
    }

    try {
      const list = await fetchPriceList();
      const governorates = list
        .map((row) => ({
          id: row._id,
          nameAr: row.governorateNameAr || row.governorateName || `محافظة ${row.governorate}`,
          nameEn: row.governorateName || "",
          price: Number(row.price) || 0,
          cities: (row.cities ?? []).map((city) => ({
            id: String(city.id),
            nameAr: city.city_name_ar,
            nameEn: city.city_name_en || "",
          })),
        }))
        .sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"));

      res.json({ source: "safka", connected: true, governorates });
    } catch (error) {
      const safka = error as SafkaError;
      console.error("[qataaty] shipping:", safka.message);
      res.json({
        source: "fallback",
        connected: true,
        error: safka.message,
        governorates: FALLBACK_GOVERNORATES.map((row) => ({ ...row, cities: [] })),
      });
    }
  });

  // -------------------------------------------------------------------------
  // إنشاء الطلب
  // -------------------------------------------------------------------------
  router.post("/orders", async (req, res) => {
    if (rateLimited(`order:${clientIp(req)}`, 8, 10 * 60 * 1000)) {
      res.status(429).json({ success: false, error: "محاولات كثيرة. برجاء المحاولة بعد قليل." });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = text(body.name, 80);
    const phone1 = cleanPhone(body.phone1);
    const phone2 = cleanPhone(body.phone2);
    const address = text(body.address, 400);
    const governorateId = text(body.governorateId, 60);
    const cityId = text(body.cityId, 40);
    const note = text(body.note, 300);
    const qty = Math.min(
      config.maxQty,
      Math.max(1, Math.floor(Number(normalizeDigits(String(body.qty ?? 1)))) || 1),
    );

    const errors: string[] = [];
    if (name.length < 3) errors.push("اكتب الاسم بالكامل.");
    if (!isValidEgyptPhone(phone1)) errors.push("رقم الموبايل غير صحيح (مثال: 01012345678).");
    if (phone2 && !isValidEgyptPhone(phone2)) errors.push("الرقم الاحتياطي غير صحيح.");
    if (address.length < 8) errors.push("اكتب العنوان بالتفصيل.");
    if (!governorateId) errors.push("اختر المحافظة.");

    if (errors.length) {
      res.status(400).json({ success: false, error: errors[0], errors });
      return;
    }

    // سعر الشحن يُحسب على السيرفر دائمًا — لا نثق بأي رقم قادم من المتصفح.
    let shipping = 0;
    let governorateName = "";
    let cityName = "";
    let realGovernorateId = governorateId;

    if (getApiKey() && !governorateId.startsWith("fallback-")) {
      try {
        const list = await fetchPriceList();
        const match = list.find((row) => row._id === governorateId);
        if (!match) {
          res.status(400).json({ success: false, error: "المحافظة المختارة غير متاحة للشحن." });
          return;
        }
        shipping = Number(match.price) || 0;
        governorateName = match.governorateNameAr || match.governorateName || "";
        cityName = match.cities?.find((city) => String(city.id) === cityId)?.city_name_ar || "";
      } catch (error) {
        console.error("[qataaty] shipping lookup:", (error as Error).message);
      }
    } else {
      const match = FALLBACK_GOVERNORATES.find((row) => row.id === governorateId);
      shipping = match?.price ?? 0;
      governorateName = match?.nameAr ?? "";
      realGovernorateId = "";
    }

    const subtotal = config.sellPrice * qty;
    const total = config.totalIncludesShipping ? subtotal + shipping : subtotal;

    const record = {
      ref: `QT-${Date.now().toString(36).toUpperCase()}`,
      created_at: new Date().toISOString(),
      customer: { name, phone1, phone2, address, governorateName, cityName },
      qty,
      unitPrice: config.sellPrice,
      subtotal,
      shipping,
      total,
      note,
      ip: clientIp(req),
      userAgent: text(req.headers["user-agent"], 200),
      synced: false as boolean,
      safka: null as unknown,
      error: null as string | null,
    };

    // لو الربط غير مكتمل: نحفظ الطلب محليًا حتى لا يضيع العميل.
    if (!getApiKey() || !realGovernorateId) {
      record.error = "الموقع غير مربوط بحساب صفقة — تم حفظ الطلب محليًا.";
      appendLine(ORDERS_LOG_FILE, record);
      void backupOrder(record);
      console.warn(`[qataaty] order saved locally (not connected): ${record.ref}`);
      void saveOrderStatus({
        reference: record.ref,
        status: "pending",
        statusAr: describeStatus("pending").label,
        qty,
        total,
        createdAt: record.created_at,
        updatedAt: record.created_at,
      });
      res.status(201).json({
        success: true,
        pendingSync: true,
        reference: record.ref,
        summary: { qty, unitPrice: config.sellPrice, subtotal, shipping, total },
      });
      return;
    }

    try {
      const product = await fetchProduct();
      const property = pickProperty(product);
      if (!property?._id) {
        throw new SafkaError("المنتج لا يحتوي على خاصية (property) صالحة للطلب.", 409);
      }

      const payload = {
        client_name: name,
        client_phone1: phone1,
        client_phone2: phone2 || "",
        client_address: [address, cityName, governorateName].filter(Boolean).join(" - "),
        shipping_governorate: realGovernorateId,
        ...(cityId ? { city: cityId } : {}),
        commission: commissionFor(product, property, qty),
        total: String(total),
        items: [{ qty: String(qty), product: product._id, property: property._id }],
        note: note || "",
        page_name: config.pageName,
        ...(config.pageId ? { page_id: config.pageId } : { page_id: null }),
      };

      const result = await createOrder(payload);
      record.synced = true;
      record.safka = result?.data ?? result;
      appendLine(ORDERS_LOG_FILE, record);
      void backupOrder(record);

      const serial = result?.data?.serial_number || record.ref;
      console.log(`[qataaty] order sent to safka: ${serial}`);

      // نسجّل الطلب عشان العميل يقدر يتتبّعه برقمه من صفحة /track،
      // والحالة بتتحدّث بعد كده من webhook صفقة.
      void saveOrderStatus({
        reference: serial,
        status: result?.data?.status ?? "pending",
        statusAr: describeStatus(result?.data?.status ?? "pending").label,
        qty,
        total,
        createdAt: record.created_at,
        updatedAt: record.created_at,
      });

      res.status(201).json({
        success: true,
        pendingSync: false,
        reference: serial,
        orderId: result?.data?._id ?? null,
        status: result?.data?.status ?? "pending",
        summary: { qty, unitPrice: config.sellPrice, subtotal, shipping, total },
      });
    } catch (error) {
      const safka = error as SafkaError;
      record.error = safka.message;
      appendLine(ORDERS_LOG_FILE, record);
      void backupOrder(record);
      console.error(`[qataaty] order FAILED (${record.ref}):`, safka.message);
      void saveOrderStatus({
        reference: record.ref,
        status: "pending",
        statusAr: describeStatus("pending").label,
        qty,
        total,
        createdAt: record.created_at,
        updatedAt: record.created_at,
      });

      // الطلب محفوظ عندنا — نُبلغ العميل بالنجاح ونتابع نحن المزامنة يدويًا.
      res.status(201).json({
        success: true,
        pendingSync: true,
        reference: record.ref,
        summary: { qty, unitPrice: config.sellPrice, subtotal, shipping, total },
      });
    }
  });

  // -------------------------------------------------------------------------
  // تتبّع الطلب — نقطة عامة، بترجّع الحالة فقط بدون أي بيانات شخصية
  // -------------------------------------------------------------------------
  router.get("/track", async (req, res) => {
    const reference = text(req.query.ref, 60);

    if (reference.length < 4) {
      res.status(400).json({ found: false, error: "اكتب رقم الطلب كامل." });
      return;
    }

    if (rateLimited(`track:${clientIp(req)}`, 40, 10 * 60 * 1000)) {
      res.status(429).json({ found: false, error: "محاولات كثيرة. جرّب بعد شوية." });
      return;
    }

    const order = await findOrderStatus(reference);

    if (!order) {
      res.status(404).json({
        found: false,
        error: "مالقيناش طلب بالرقم ده. اتأكد من الرقم أو كلّمنا.",
      });
      return;
    }

    const info = describeStatus(order.status);
    // صياغتنا أوضح للعميل من تسمية صفقة الداخلية («معلق» مثلًا)،
    // فبنستخدم statusAr بتاعهم فقط لو الحالة مش معروفة عندنا.
    const known = Object.prototype.hasOwnProperty.call(STATUS_MAP, order.status);

    res.json({
      found: true,
      reference: order.reference,
      status: order.status,
      label: known ? info.label : order.statusAr || info.label,
      note: info.note,
      stage: info.stage,
      tone: info.tone,
      qty: order.qty,
      total: order.total,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  });

  // -------------------------------------------------------------------------
  // خطوة الربط: تحويل صاحب الحساب لصفحة الموافقة على صفقة
  // -------------------------------------------------------------------------
  router.get("/safka/connect", (req, res) => {
    const origin =
      config.publicUrl || `${req.protocol}://${req.get("host") ?? "localhost:3000"}`;

    const url = new URL(config.connectBase);
    url.searchParams.set("name", config.pageName);
    url.searchParams.set("redirectUrl", `${origin}/admin?connected=1`);
    url.searchParams.set("productHook", `${origin}/api/hooks/product`);
    url.searchParams.set("orderHook", `${origin}/api/hooks/order`);
    url.searchParams.set("callbackAPI", `${origin}/api/safka/callback`);

    if (String(req.query.preview) === "1") {
      res.json({ url: url.toString(), origin });
      return;
    }
    res.redirect(url.toString());
  });

  /** صفقة تُرسل المفتاح هنا مرة واحدة بعد ضغط «سماح». */
  router.post("/safka/callback", (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const key = String(body.api_safka_key ?? "").trim();

    if (!key) {
      res.status(400).json({ success: false, error: "api_safka_key is required" });
      return;
    }

    const { persisted } = writeStoredKey({
      api_safka_key: key,
      name: String(body.name ?? ""),
      _id: String(body._id ?? ""),
      productHook: String(body.productHook ?? ""),
      orderHook: String(body.orderHook ?? ""),
      callbackAPI: String(body.callbackAPI ?? ""),
    });
    clearSafkaCache();

    // على Vercel الملف بيضيع مع أي نشر أو instance جديد — بنطبع المفتاح مرة
    // واحدة في السجلّات عشان صاحب الموقع ينسخه لمتغيّرات البيئة.
    console.log("[qataaty] ✅ received api-safka-key from Safka callback");
    if (!persisted || IS_SERVERLESS) {
      console.log(`[qataaty] ⚠️  set this in your env vars → SAFKA_API_KEY=${key}`);
    }

    res.json({ success: true });
  });

  /** صفقة تُرسل تحديثات حالة الطلب هنا. */
  router.post("/hooks/order", (req, res) => {
    appendLine(EVENTS_LOG_FILE, { received_at: new Date().toISOString(), type: "order", payload: req.body });

    const order = (req.body as {
      order?: { serial_number?: string; status?: string; status_ar?: string };
    })?.order;

    console.log(`[qataaty] order webhook: ${order?.serial_number ?? "?"} → ${order?.status_ar ?? "?"}`);

    // ده المصدر الوحيد لحالة الطلب — صفقة مالهاش نقطة API لجلبها.
    if (order?.serial_number && order.status) {
      void updateOrderStatus(order.serial_number, order.status, order.status_ar);
    }

    res.json({ success: true });
  });

  /** صفقة تُرسل بيانات المنتج هنا عند دفعه لنا. */
  router.post("/hooks/product", (req, res) => {
    appendLine(EVENTS_LOG_FILE, { received_at: new Date().toISOString(), type: "product", payload: req.body });
    clearSafkaCache();
    res.json({ success: true });
  });

  // -------------------------------------------------------------------------
  // نقاط الإدارة (محمية بـ ADMIN_TOKEN)
  // -------------------------------------------------------------------------
  router.get("/admin/status", requireAdmin, async (_req, res) => {
    const stored = readStoredKey();
    const key = getApiKey();
    const base = {
      connected: Boolean(key),
      keySource: process.env.SAFKA_API_KEY ? "env" : stored ? "callback" : null,
      keyPreview: key ? `${key.slice(0, 6)}…${key.slice(-4)}` : null,
      keyName: stored?.name ?? null,
      hooks: { product: stored?.productHook ?? null, order: stored?.orderHook ?? null },
      productId: config.productId,
      sellPrice: config.sellPrice,
      compareAtPrice: config.compareAtPrice,
      serverless: IS_SERVERLESS,
      ordersWebhook: Boolean(config.ordersWebhookUrl),
      trackingStore: HAS_KV,
    };

    if (!key) {
      res.json({ ...base, product: null, governorates: 0 });
      return;
    }

    try {
      const [product, list] = await Promise.all([fetchProduct(), fetchPriceList()]);
      const property = pickProperty(product);
      res.json({
        ...base,
        product: {
          name: product.name,
          barcode: product.barcode,
          basePrice: basePrice(product, property),
          propertyId: property?._id ?? null,
          propertyName: property?.key ?? null,
          minPrice: property?.min ?? null,
        },
        commissionPerUnit: commissionFor(product, property, 1),
        governorates: list.length,
      });
    } catch (error) {
      res.json({ ...base, product: null, governorates: 0, error: (error as Error).message });
    }
  });

  router.get("/admin/orders", requireAdmin, (_req, res) => {
    res.json({ orders: readLines(ORDERS_LOG_FILE, 100) });
  });

  router.get("/admin/events", requireAdmin, (_req, res) => {
    res.json({ events: readLines(EVENTS_LOG_FILE, 100) });
  });

  router.post("/admin/refresh", requireAdmin, (_req, res) => {
    clearSafkaCache();
    res.json({ success: true });
  });

  // -------------------------------------------------------------------------
  router.use((req, res) => {
    res.status(404).json({ success: false, error: `لا توجد نقطة API بهذا المسار: ${req.path}` });
  });

  return router;
}
