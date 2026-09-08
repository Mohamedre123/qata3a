/**
 * Meta Conversions API — إرسال حدث الشراء من السيرفر.
 *
 * ليه؟ بيكسل المتصفح لوحده بيضيّع نسبة كبيرة من الأحداث (مانعات الإعلانات،
 * iOS، إغلاق الصفحة بسرعة بعد الطلب). الإرسال من السيرفر بيوصل دايمًا.
 *
 * منع التكرار: الحدثين (المتصفح والسيرفر) بيتبعتوا بنفس `event_id`، فميتا
 * بتعتبرهم حدث واحد. المعرّف بيتولّد هنا وبيترجع للواجهة مع رد الطلب.
 *
 * الأكسس توكن سرّي: بيتقرا من متغيّر البيئة META_ACCESS_TOKEN، وعمره ما
 * يتبعت للمتصفح ولا يتعمله commit.
 *
 * كل ده fire-and-forget: أي فشل هنا **مش** بيأثر على إنشاء الطلب على صفقة.
 */
import crypto from "node:crypto";

const ACCESS_TOKEN = (process.env.META_ACCESS_TOKEN || "").trim();
const PIXEL_ID = (process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID || "1979727459402689").trim();
const API_VERSION = process.env.META_API_VERSION || "v21.0";
/** كود اختبار مؤقت من Events Manager للتأكد إن الأحداث بتوصل. */
const TEST_EVENT_CODE = (process.env.META_TEST_EVENT_CODE || "").trim();

export const HAS_META_CAPI = Boolean(ACCESS_TOKEN && PIXEL_ID);

/** ميتا بتطلب كل بيانات العميل مهشّرة SHA-256 بعد تنظيفها. */
function hash(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/**
 * تحويل الرقم المصري لصيغة دولية بدون علامة زائد، زي ما ميتا بتتوقع:
 * 01012345678 → 201012345678
 */
function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return `20${digits}`;
}

export type PurchaseEvent = {
  eventId: string;
  eventTime: number;
  value: number;
  quantity: number;
  contentId: string;
  contentName: string;
  orderRef: string;
  customer: { name?: string; phone?: string; city?: string; governorate?: string };
  clientIp?: string;
  userAgent?: string;
  sourceUrl?: string;
  /** قيم كوكيز ميتا لو وصلت من المتصفح — بتحسّن المطابقة كتير. */
  fbp?: string;
  fbc?: string;
};

/** يولّد معرّف حدث فريد يربط حدث المتصفح بحدث السيرفر. */
export function newEventId(): string {
  return crypto.randomUUID();
}

/**
 * يبعت حدث Purchase لميتا. مش بيرمي أخطاء أبدًا — بيسجّلها وبس.
 */
export async function sendPurchaseEvent(event: PurchaseEvent): Promise<void> {
  if (!HAS_META_CAPI) return;

  const { customer } = event;
  const phone = customer.phone ? normalizePhone(customer.phone) : null;

  // الاسم بيتقسم لأول واسم عيلة زي ما ميتا بتحب.
  const nameParts = (customer.name ?? "").trim().split(/\s+/).filter(Boolean);

  const userData: Record<string, unknown> = {
    ...(phone ? { ph: [hash(phone)] } : {}),
    ...(nameParts[0] ? { fn: [hash(nameParts[0])] } : {}),
    ...(nameParts.length > 1 ? { ln: [hash(nameParts[nameParts.length - 1])] } : {}),
    ...(customer.city ? { ct: [hash(customer.city.replace(/\s/g, ""))] } : {}),
    ...(customer.governorate ? { st: [hash(customer.governorate.replace(/\s/g, ""))] } : {}),
    country: [hash("eg")],
    ...(event.clientIp && event.clientIp !== "unknown" ? { client_ip_address: event.clientIp } : {}),
    ...(event.userAgent ? { client_user_agent: event.userAgent } : {}),
    ...(event.fbp ? { fbp: event.fbp } : {}),
    ...(event.fbc ? { fbc: event.fbc } : {}),
  };

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: event.eventTime,
        event_id: event.eventId,
        action_source: "website",
        ...(event.sourceUrl ? { event_source_url: event.sourceUrl } : {}),
        user_data: userData,
        custom_data: {
          currency: "EGP",
          value: event.value,
          content_type: "product",
          content_ids: [event.contentId],
          content_name: event.contentName,
          contents: [{ id: event.contentId, quantity: event.quantity }],
          num_items: event.quantity,
          order_id: event.orderRef,
        },
      },
    ],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      },
    );

    const body = (await response.json().catch(() => null)) as
      | { events_received?: number; error?: { message?: string } }
      | null;

    if (!response.ok) {
      console.error(`[qataaty] Meta CAPI ${response.status}: ${body?.error?.message ?? "unknown error"}`);
      return;
    }

    console.log(`[qataaty] Meta CAPI purchase sent (${event.orderRef}), received=${body?.events_received ?? "?"}`);
  } catch (error) {
    console.error("[qataaty] Meta CAPI failed:", (error as Error).message);
  }
}
