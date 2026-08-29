/**
 * إعدادات الربط مع منصة صفقة (Safka Public API).
 *
 * كل القيم تُقرأ من متغيّرات البيئة (.env) حتى لا يظهر مفتاح الـ API أبدًا
 * داخل كود الواجهة. الواجهة تتحدث مع سيرفرنا فقط، والسيرفر هو من يتحدث مع صفقة.
 */
import "./env.js";

import fs from "node:fs";
import path from "node:path";

/**
 * جذر المشروع. `import.meta.dirname` متاح عند التشغيل عبر Node مباشرة،
 * وقد يكون غير معرّف عند تحميل الملف داخل سيرفر Vite — فنرجع لمجلد العمل.
 */
const MODULE_DIR: string | undefined = import.meta?.dirname;
const PROJECT_ROOT = MODULE_DIR ? path.resolve(MODULE_DIR, "..") : process.cwd();

/**
 * على Vercel (وأي بيئة serverless) نظام الملفات للقراءة فقط ما عدا /tmp،
 * و/tmp نفسه مؤقّت وبيتمسح. فبنكتب فيه كمحاولة أخيرة بس، والاعتماد الحقيقي
 * على لوحة صفقة + سجلّات Vercel + ORDERS_WEBHOOK_URL الاختياري.
 */
export const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_SERVERLESS ? "/tmp" : PROJECT_ROOT;

/** ملف يحفظ المفتاح القادم من callbackAPI تلقائيًا بعد موافقة المسوّق. */
export const KEY_STORE_FILE = path.join(DATA_DIR, ".safka-key.json");
/** سجل محلي لكل طلب يمرّ من الصفحة — شبكة أمان لو فشل الإرسال لصفقة. */
export const ORDERS_LOG_FILE = path.join(DATA_DIR, "orders.jsonl");
/** سجل التحديثات القادمة من صفقة على orderHook. */
export const EVENTS_LOG_FILE = path.join(DATA_DIR, "safka-events.jsonl");

/**
 * نسخة من المفتاح في ذاكرة العملية — على serverless الملف بيضيع مع كل
 * instance جديد، فالنسخة دي بتخلّي الـ callback يشتغل على الأقل داخل نفس
 * الـ instance لحد ما تحط المفتاح في متغيّرات البيئة.
 */
let memoryKey: StoredKeyShape | null = null;

type StoredKeyShape = {
  api_safka_key: string;
  name?: string;
  _id?: string;
  productHook?: string;
  orderHook?: string;
  callbackAPI?: string;
  received_at?: string;
};

function num(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function bool(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1" || value === "yes";
}

export type StoredKey = StoredKeyShape;

/** يقرأ المفتاح المحفوظ من ملف الـ callback (إن وُجد). */
export function readStoredKey(): StoredKey | null {
  if (memoryKey) return memoryKey;
  try {
    if (!fs.existsSync(KEY_STORE_FILE)) return null;
    const parsed = JSON.parse(fs.readFileSync(KEY_STORE_FILE, "utf-8")) as StoredKey;
    if (!parsed?.api_safka_key) return null;
    memoryKey = parsed;
    return parsed;
  } catch {
    return null;
  }
}

/** يحفظ المفتاح في الذاكرة دائمًا، وعلى القرص لو أمكن. */
export function writeStoredKey(payload: StoredKey) {
  memoryKey = { ...payload, received_at: new Date().toISOString() };
  try {
    fs.writeFileSync(KEY_STORE_FILE, JSON.stringify(memoryKey, null, 2), "utf-8");
    return { persisted: true };
  } catch (error) {
    console.warn(`[qataaty] could not persist key to disk: ${(error as Error).message}`);
    return { persisted: false };
  }
}

/**
 * المفتاح الفعّال: متغيّر البيئة أولًا، ثم المفتاح المحفوظ من الـ callback.
 * يُقرأ عند كل طلب حتى يعمل الربط فورًا بعد وصول الـ callback بدون إعادة تشغيل.
 */
export function getApiKey(): string {
  const fromEnv = (process.env.SAFKA_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  return readStoredKey()?.api_safka_key?.trim() || "";
}

export const config = {
  /** عنوان الـ API الأساسي لمنصة صفقة. */
  apiBase: (process.env.SAFKA_API_BASE || "https://api.safka-eg.com").replace(/\/+$/, ""),
  /** صفحة الموافقة التي يُحوَّل إليها صاحب الحساب لإنشاء المفتاح. */
  connectBase:
    process.env.SAFKA_CONNECT_URL || "https://aff.safka-eg.com/intergations/apiSafkaKeys/connect",

  /** معرّف المنتج على صفقة (من رابط المنتج في لوحة المسوّق). */
  productId: (process.env.SAFKA_PRODUCT_ID || "6a7c9cab42d4b8fe405be078").trim(),
  /** معرّف الخاصية (property) — يُختار تلقائيًا من المنتج لو تُرك فارغًا. */
  propertyId: (process.env.SAFKA_PROPERTY_ID || "").trim(),

  /** سعر البيع للعميل. */
  sellPrice: num(process.env.SELL_PRICE, 590),
  /** السعر قبل الخصم (للعرض فقط). */
  compareAtPrice: num(process.env.COMPARE_AT_PRICE, 700),
  /** أقصى كمية في الطلب الواحد. */
  maxQty: num(process.env.MAX_QTY, 10),

  /** اسم الصفحة الذي يظهر لصفقة على الطلب. */
  pageName: process.env.SAFKA_PAGE_NAME || "قطاعتي",
  pageId: process.env.SAFKA_PAGE_ID || "",

  /** هل يُضاف الشحن إلى حقل total المُرسل لصفقة. */
  totalIncludesShipping: bool(process.env.SAFKA_TOTAL_INCLUDES_SHIPPING, true),
  /** عمولة ثابتة بدل الحساب التلقائي (سعر البيع - سعر المنتج). */
  fixedCommission: process.env.SAFKA_COMMISSION ? Number(process.env.SAFKA_COMMISSION) : null,

  /** رابط الموقع العام — يُستخدم لبناء روابط الـ hooks في صفحة الربط. */
  publicUrl: (process.env.PUBLIC_URL || "").replace(/\/+$/, ""),
  /** كلمة سر بسيطة لحماية صفحة /admin ونقاط الإدارة. */
  adminToken: (process.env.ADMIN_TOKEN || "").trim(),

  /**
   * رابط اختياري تُرسَل إليه نسخة من كل طلب (Google Sheets / Make / n8n…).
   * مهم على Vercel لأن الملفات المحلية بتضيع — ده أضمن سجل احتياطي عندك.
   */
  ordersWebhookUrl: (process.env.ORDERS_WEBHOOK_URL || "").trim(),

  /** مدة صلاحية الكاش (بالملّي ثانية). */
  productCacheMs: num(process.env.PRODUCT_CACHE_MS, 5 * 60 * 1000),
  shippingCacheMs: num(process.env.SHIPPING_CACHE_MS, 15 * 60 * 1000),
};

export type AppConfig = typeof config;
