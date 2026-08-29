/**
 * مخزن حالات الطلبات — الأساس اللي بيقوم عليه تتبّع الطلب للعميل.
 *
 * صفقة مالهاش نقطة API لجلب حالة طلب، لكنها بتبعت كل تغيير حالة على
 * الـ orderHook بتاعنا. فبنسجّل الحالة هنا أول ما الطلب يتعمل، وبنحدّثها مع
 * كل webhook، والعميل بيسأل عنها برقم طلبه من /api/track.
 *
 * التخزين:
 *   • Vercel KV / Upstash Redis لو متظبط (KV_REST_API_URL + KV_REST_API_TOKEN)
 *     — ده الوضع الصحيح في الإنتاج لأن الملفات على Vercel بتتمسح.
 *   • وإلا: ملف محلي + ذاكرة، وده كافي للتشغيل المحلي.
 */
import fs from "node:fs";
import path from "node:path";
import { IS_SERVERLESS } from "./config.js";

export type TrackedOrder = {
  reference: string;
  status: string;
  statusAr: string;
  qty: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/+$/, "");
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const HAS_KV = Boolean(KV_URL && KV_TOKEN);

/** الطلبات تفضل قابلة للتتبّع لمدة 90 يوم. */
const TTL_SECONDS = 90 * 24 * 60 * 60;
const KEY_PREFIX = "qataaty:order:";

const memory = new Map<string, TrackedOrder>();
const FILE = path.join(IS_SERVERLESS ? "/tmp" : process.cwd(), "order-status.json");

// ---------------------------------------------------------------------------
// حالات صفقة كما هي في توثيقهم، مع صياغة مفهومة للعميل ومرحلة للشريط.
// ---------------------------------------------------------------------------

type StatusInfo = { label: string; note: string; stage: number; tone: "progress" | "done" | "problem" };

/** stage: 1 استلمنا · 2 بنجهّز · 3 في الشحن · 4 خلص. */
export const STATUS_MAP: Record<string, StatusInfo> = {
  pending: { label: "تم استلام الطلب", note: "طلبك وصلنا وهنكلمك للتأكيد.", stage: 1, tone: "progress" },
  holding: { label: "مؤجَّل", note: "الطلب متأجّل مؤقتًا — هنتواصل معاك.", stage: 1, tone: "problem" },
  preparing: { label: "جارٍ التحضير", note: "بنجهّز طلبك للشحن.", stage: 2, tone: "progress" },
  printing: { label: "جارٍ الطباعة", note: "بنجهّز بوليصة الشحن.", stage: 2, tone: "progress" },
  shipped: { label: "في الشحن", note: "طلبك مع شركة الشحن وفي طريقه ليك.", stage: 3, tone: "progress" },
  available: { label: "تم التوصيل", note: "طلبك اتسلّم. بالهنا والشفا!", stage: 4, tone: "done" },
  collected: { label: "تم التحصيل", note: "تم استلام الطلب والدفع. شكرًا لثقتك!", stage: 4, tone: "done" },
  ask_to_exchange: { label: "طلب استبدال", note: "استلمنا طلب الاستبدال وبنراجعه.", stage: 4, tone: "problem" },
  returned_exchange: { label: "مرتجع استبدال", note: "تم استرجاع الشحنة للاستبدال.", stage: 4, tone: "problem" },
  ask_to_return: { label: "طلب استرجاع", note: "استلمنا طلب الاسترجاع وبنراجعه.", stage: 4, tone: "problem" },
  skip: { label: "جارٍ الاسترجاع", note: "الشحنة في طريقها للاسترجاع.", stage: 3, tone: "problem" },
  returned1: { label: "مرتجع", note: "الشحنة رجعت لينا.", stage: 4, tone: "problem" },
  returned2: { label: "مرتجع بعد التسليم", note: "الشحنة رجعت بعد التسليم.", stage: 4, tone: "problem" },
  declined1: { label: "ملغي", note: "الطلب اتلغى. لو ده مش صح كلّمنا.", stage: 4, tone: "problem" },
  declined2: { label: "ملغي بعد التحضير", note: "الطلب اتلغى بعد التحضير.", stage: 4, tone: "problem" },
};

export function describeStatus(status: string): StatusInfo {
  return (
    STATUS_MAP[status] ?? {
      label: "قيد المتابعة",
      note: "طلبك تحت المتابعة وهنكلمك بأي جديد.",
      stage: 2,
      tone: "progress",
    }
  );
}

// ---------------------------------------------------------------------------
// التخزين
// ---------------------------------------------------------------------------

async function kvFetch(command: string[]): Promise<unknown> {
  const response = await fetch(KV_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`KV ${response.status}`);
  return ((await response.json()) as { result?: unknown }).result;
}

function readFileStore(): Record<string, TrackedOrder> {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as Record<string, TrackedOrder>;
  } catch {
    return {};
  }
}

function writeFileStore(all: Record<string, TrackedOrder>) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(all), "utf-8");
  } catch {
    /* نظام ملفات للقراءة فقط — الذاكرة تكفي لعمر الـ instance */
  }
}

/** المفتاح موحّد بحروف صغيرة عشان العميل ما يتعبش في كتابة الرقم. */
const normalize = (reference: string) => reference.trim().toLowerCase();

export async function saveOrderStatus(order: TrackedOrder): Promise<void> {
  const key = normalize(order.reference);
  memory.set(key, order);

  if (HAS_KV) {
    try {
      await kvFetch(["SET", KEY_PREFIX + key, JSON.stringify(order), "EX", String(TTL_SECONDS)]);
      return;
    } catch (error) {
      console.error("[qataaty] KV write failed:", (error as Error).message);
    }
  }

  const all = readFileStore();
  all[key] = order;
  writeFileStore(all);
}

export async function findOrderStatus(reference: string): Promise<TrackedOrder | null> {
  const key = normalize(reference);
  if (!key) return null;

  if (HAS_KV) {
    try {
      const raw = await kvFetch(["GET", KEY_PREFIX + key]);
      if (typeof raw === "string") return JSON.parse(raw) as TrackedOrder;
    } catch (error) {
      console.error("[qataaty] KV read failed:", (error as Error).message);
    }
  }

  return memory.get(key) ?? readFileStore()[key] ?? null;
}

/** يحدّث الحالة فقط مع الحفاظ على بيانات الطلب المسجّلة وقت الإنشاء. */
export async function updateOrderStatus(
  reference: string,
  status: string,
  statusAr?: string,
): Promise<void> {
  const existing = await findOrderStatus(reference);
  await saveOrderStatus({
    reference,
    qty: existing?.qty ?? 0,
    total: existing?.total ?? 0,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    status,
    statusAr: statusAr || describeStatus(status).label,
    updatedAt: new Date().toISOString(),
  });
}
