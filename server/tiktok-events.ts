/**
 * TikTok Events API 2.0 — إرسال حدث الشراء من السيرفر.
 *
 * نفس فكرة Meta CAPI بالظبط: بيكسل المتصفح لوحده بيضيّع نسبة من الأحداث
 * (مانعات إعلانات، iOS، قفل الصفحة بسرعة)، والإرسال من السيرفر بيوصل دايمًا.
 *
 * منع التكرار: حدث المتصفح وحدث السيرفر بيتبعتوا بنفس `event_id`، فتيك توك
 * بتعتبرهم حدث واحد.
 *
 * فروق مهمة عن ميتا:
 *   • تيك توك بتطلب الموبايل بصيغة E.164 **مع** علامة + قبل التهشير،
 *     بينما ميتا بتطلبه من غيرها.
 *   • المعرّفات هنا `ttclid` (من الرابط) و `ttp` (كوكي _ttp).
 *
 * الأكسس توكن سرّي: بيتقرا من TIKTOK_ACCESS_TOKEN وعمره ما يوصل للمتصفح.
 * وكل ده fire-and-forget — أي فشل هنا **مش** بيأثر على إنشاء الطلب على صفقة.
 */
import crypto from "node:crypto";

const ACCESS_TOKEN = (process.env.TIKTOK_ACCESS_TOKEN || "").trim();
const PIXEL_ID = (process.env.TIKTOK_PIXEL_ID || process.env.VITE_TIKTOK_PIXEL_ID || "DAFKHSJC77U3EU7G6J30").trim();
/** لازم يطابق VITE_TIKTOK_PURCHASE_EVENT في الواجهة عشان الدمج يشتغل. */
const PURCHASE_EVENT = (process.env.TIKTOK_PURCHASE_EVENT || process.env.VITE_TIKTOK_PURCHASE_EVENT || "CompletePayment").trim();
/** كود اختبار مؤقت من Events Manager. */
const TEST_EVENT_CODE = (process.env.TIKTOK_TEST_EVENT_CODE || "").trim();

/** قابل للتوجيه لسيرفر وهمي أثناء الاختبار. */
const ENDPOINT =
  process.env.TIKTOK_API_URL || "https://business-api.tiktok.com/open_api/v1.3/event/track/";

export const HAS_TIKTOK_EVENTS = Boolean(ACCESS_TOKEN && PIXEL_ID);

function hash(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/** تيك توك بتتوقع E.164 مع علامة +: 01012345678 → +201012345678 */
function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("20")) return `+${digits}`;
  if (digits.startsWith("0")) return `+20${digits.slice(1)}`;
  return `+20${digits}`;
}

export type TikTokPurchase = {
  eventId: string;
  eventTime: number;
  value: number;
  quantity: number;
  contentId: string;
  contentName: string;
  orderRef: string;
  customer: { phone?: string };
  clientIp?: string;
  userAgent?: string;
  sourceUrl?: string;
  ttclid?: string;
  ttp?: string;
};

export async function sendTikTokPurchase(event: TikTokPurchase): Promise<void> {
  if (!HAS_TIKTOK_EVENTS) return;

  const phone = event.customer.phone ? normalizePhone(event.customer.phone) : null;
  const unitPrice = event.quantity > 0 ? event.value / event.quantity : event.value;

  const payload = {
    event_source: "web",
    event_source_id: PIXEL_ID,
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
    data: [
      {
        event: PURCHASE_EVENT,
        event_time: event.eventTime,
        event_id: event.eventId,
        user: {
          ...(phone ? { phone: hash(phone) } : {}),
          // معرّف ثابت للعميل — بيرفع جودة المطابقة زي ما بيعمل عند ميتا.
          ...(phone ? { external_id: hash(phone) } : {}),
          ...(event.ttclid ? { ttclid: event.ttclid } : {}),
          ...(event.ttp ? { ttp: event.ttp } : {}),
          ...(event.clientIp && event.clientIp !== "unknown" ? { ip: event.clientIp } : {}),
          ...(event.userAgent ? { user_agent: event.userAgent } : {}),
        },
        properties: {
          currency: "EGP",
          value: event.value,
          order_id: event.orderRef,
          contents: [
            {
              content_id: event.contentId,
              content_name: event.contentName,
              content_type: "product",
              quantity: event.quantity,
              price: Number(unitPrice.toFixed(2)),
            },
          ],
        },
        ...(event.sourceUrl ? { page: { url: event.sourceUrl } } : {}),
      },
    ],
  };

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Access-Token": ACCESS_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    // تيك توك بترجّع 200 حتى مع الأخطاء — الحقيقة في حقل code (0 = نجاح).
    const body = (await response.json().catch(() => null)) as
      | { code?: number; message?: string }
      | null;

    if (!response.ok || (body?.code !== undefined && body.code !== 0)) {
      console.error(
        `[qataaty] TikTok Events API failed (code=${body?.code ?? response.status}): ${body?.message ?? "unknown error"}`,
      );
      return;
    }

    console.log(`[qataaty] TikTok ${PURCHASE_EVENT} sent (${event.orderRef})`);
  } catch (error) {
    console.error("[qataaty] TikTok Events API failed:", (error as Error).message);
  }
}
