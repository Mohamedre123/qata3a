/**
 * عميل الاتصال بمنصة صفقة (Safka Public API).
 *
 * ملاحظة مهمة: الـ API عند صفقة يقبل نطاقات safka-eg.com فقط في CORS، ويردّ
 * بخطأ 500 على أي Origin آخر. لذلك لا يمكن استدعاؤه من المتصفح مباشرة —
 * كل النداءات تمرّ من هذا الملف على السيرفر، وهو أيضًا المكان الآمن الوحيد
 * لحفظ المفتاح.
 */
import { config, getApiKey } from "./config.js";

export type SafkaProperty = {
  _id: string;
  key?: string;
  value?: number;
  min?: number;
  sale_price?: number;
  is_available?: boolean;
};

export type SafkaFaq = {
  _id?: string;
  question: string;
  answer: string;
  is_active?: boolean;
  order?: number;
};

export type SafkaProduct = {
  _id: string;
  name: string;
  barcode?: string;
  sale_price?: number;
  images?: string[];
  image?: string;
  description?: string;
  note?: string;
  media_url?: string;
  properties?: SafkaProperty[];
  faqs?: SafkaFaq[];
  is_active?: boolean;
};

export type SafkaCity = { id: string; city_name_ar: string; city_name_en?: string };

export type SafkaPricing = {
  _id: string;
  governorate: number;
  price: number;
  is_active?: boolean;
  governorateName?: string;
  governorateNameAr?: string;
  cities?: SafkaCity[];
};

export class SafkaError extends Error {
  status: number;
  details: unknown;
  constructor(message: string, status = 502, details: unknown = null) {
    super(message);
    this.name = "SafkaError";
    this.status = status;
    this.details = details;
  }
}

function firstErrorMessage(body: unknown, fallback: string) {
  const errors = (body as { errors?: { msg?: string }[] })?.errors;
  if (Array.isArray(errors) && errors[0]?.msg) return String(errors[0].msg);
  const message = (body as { message?: string })?.message;
  return message ? String(message) : fallback;
}

async function safkaFetch<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const key = getApiKey();
  if (!key) {
    throw new SafkaError("لم يتم ربط الموقع بحساب صفقة بعد (مفتاح API غير موجود).", 503);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 15000);

  try {
    const response = await fetch(`${config.apiBase}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "api-safka-key": key,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });

    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!response.ok) {
      throw new SafkaError(
        firstErrorMessage(body, `فشل الاتصال بمنصة صفقة (${response.status}).`),
        response.status,
        body,
      );
    }

    return body as T;
  } catch (error) {
    if (error instanceof SafkaError) throw error;
    if ((error as Error)?.name === "AbortError") {
      throw new SafkaError("انتهت مهلة الاتصال بمنصة صفقة.", 504);
    }
    throw new SafkaError(`تعذّر الوصول لمنصة صفقة: ${(error as Error).message}`, 502);
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// كاش بسيط في الذاكرة — يقلّل النداءات ويُبقي الصفحة سريعة.
// ---------------------------------------------------------------------------

type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const value = await loader();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function clearSafkaCache() {
  cache.clear();
}

// ---------------------------------------------------------------------------
// نقاط الـ API
// ---------------------------------------------------------------------------

/** GET /api/v1/public/product/:id */
export async function fetchProduct(productId = config.productId): Promise<SafkaProduct> {
  return cached(`product:${productId}`, config.productCacheMs, async () => {
    const body = await safkaFetch<{ product?: SafkaProduct } & SafkaProduct>(
      `/api/v1/public/product/${encodeURIComponent(productId)}`,
    );
    const product = body?.product ?? (body as SafkaProduct);
    if (!product?._id) throw new SafkaError("لم يتم العثور على المنتج على صفقة.", 404);
    return product;
  });
}

/** GET /api/v1/public/price-list — يجلب كل الصفحات ويجمعها. */
export async function fetchPriceList(): Promise<SafkaPricing[]> {
  return cached("price-list", config.shippingCacheMs, async () => {
    const all: SafkaPricing[] = [];
    const size = 100;

    for (let page = 1; page <= 10; page += 1) {
      const body = await safkaFetch<{ data?: SafkaPricing[]; pages?: number }>(
        `/api/v1/public/price-list?page=${page}&size=${size}`,
      );
      const rows = Array.isArray(body?.data) ? body.data : [];
      all.push(...rows);
      const totalPages = Number(body?.pages) || 1;
      if (page >= totalPages || rows.length === 0) break;
    }

    return all.filter((row) => row?._id && row.is_active !== false);
  });
}

export type CreateOrderPayload = {
  client_name: string;
  client_phone1: string;
  client_phone2?: string;
  client_address: string;
  shipping_governorate: string;
  city?: string;
  commission: number;
  total: string;
  items: { qty: string; product: string; property: string }[];
  note?: string;
  page_name?: string;
  page_id?: string | null;
};

export type CreateOrderResult = {
  success?: boolean;
  data?: { _id?: string; status?: string; serial_number?: string; marketer?: string };
};

/** POST /api/v1/public/orders */
export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
  return safkaFetch<CreateOrderResult>("/api/v1/public/orders", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 20000,
  });
}

/** يتحقق أن المفتاح صالح وأن الحساب مسموح له باستخدام الـ Public API. */
export async function pingSafka(): Promise<{ ok: true }> {
  await safkaFetch("/api/v1/public/price-list?page=1&size=1", { timeoutMs: 10000 });
  return { ok: true };
}
