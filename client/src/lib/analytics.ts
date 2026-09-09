/**
 * بيكسل ميتا وتيك توك.
 *
 * مبادئ مهمة:
 *   • السكربتات بتتحمّل async بعد ما الصفحة تشتغل — عمرها ما تعطّل الطلب.
 *   • كل نداء متغلّف في try/catch: لو البيكسل اتمنع (AdBlock مثلًا) الموقع
 *     يفضل شغّال عادي والطلب يروح لصفقة زي ما هو.
 *   • معرّفات البيكسل عامة مش سرّية. الأكسس توكن السرّي بتاع ميتا موجود على
 *     السيرفر بس (راجع server/meta-capi.ts) وعمره ما يوصل للمتصفح.
 */

const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || "1979727459402689";
const TIKTOK_PIXEL_ID = import.meta.env.VITE_TIKTOK_PIXEL_ID || "DAFKHSJC77U3EU7G6J30";

/**
 * حدث الشراء عند تيك توك.
 *
 * CompletePayment هو اللي بتتحسّن عليه حملات التسوّق في تيك توك، وهو اللي
 * متضبّطة عليه حملتنا. (PlaceAnOrder أدقّ حرفيًا مع الدفع عند الاستلام لأن
 * العميل لسه مدفعش، بس التحسين مش بيشتغل عليه كويس.)
 */
const TIKTOK_PURCHASE_EVENT = import.meta.env.VITE_TIKTOK_PURCHASE_EVENT || "CompletePayment";

const CURRENCY = "EGP";

type Contents = { value: number; qty: number; contentId: string; contentName: string };

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string };
    _fbq?: unknown;
    ttq?: Record<string, (...args: unknown[]) => void> & { load?: (id: string) => void; page?: () => void };
    TiktokAnalyticsObject?: string;
  }
}

let started = false;

/** يحمّل البيكسلين مرة واحدة. يُستدعى بعد أول رسم للصفحة. */
export function initAnalytics() {
  if (started || typeof window === "undefined") return;
  started = true;

  try {
    loadMetaPixel();
  } catch (error) {
    console.warn("[analytics] meta pixel failed:", (error as Error).message);
  }

  try {
    loadTikTokPixel();
  } catch (error) {
    console.warn("[analytics] tiktok pixel failed:", (error as Error).message);
  }
}

function loadMetaPixel() {
  if (!META_PIXEL_ID || window.fbq) return;

  /* eslint-disable */
  // مقتطف ميتا الرسمي، مكتوب بشكل مقروء بدل النسخة المضغوطة.
  const fbq: any = function (...args: unknown[]) {
    fbq.callMethod ? fbq.callMethod.apply(fbq, args) : fbq.queue.push(args);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  /* eslint-enable */

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  window.fbq?.("init", META_PIXEL_ID);
  window.fbq?.("track", "PageView");
}

function loadTikTokPixel() {
  if (!TIKTOK_PIXEL_ID || window.ttq) return;

  const methods = [
    "page", "track", "identify", "instances", "debug", "on", "off", "once", "ready",
    "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent",
  ];

  /* eslint-disable */
  const ttq: any = [];
  ttq.methods = methods;
  ttq.setAndDefer = function (target: any, method: string) {
    target[method] = function (...args: unknown[]) {
      target.push([method, ...args]);
    };
  };
  for (const method of methods) ttq.setAndDefer(ttq, method);

  ttq.instance = function (id: string) {
    const instance = ttq._i[id] || [];
    for (const method of methods) ttq.setAndDefer(instance, method);
    return instance;
  };

  ttq.load = function (id: string, options?: Record<string, unknown>) {
    const src = "https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i = ttq._i || {};
    ttq._i[id] = [];
    ttq._i[id]._u = src;
    ttq._t = ttq._t || {};
    ttq._t[id] = +new Date();
    ttq._o = ttq._o || {};
    ttq._o[id] = options || {};

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = `${src}?sdkid=${id}&lib=ttq`;
    document.head.appendChild(script);
  };

  window.TiktokAnalyticsObject = "ttq";
  window.ttq = ttq;
  /* eslint-enable */

  ttq.load(TIKTOK_PIXEL_ID);
  ttq.page();
}

// ---------------------------------------------------------------------------
// المطابقة المتقدمة (Advanced Matching)
// ---------------------------------------------------------------------------

/**
 * تحويل الرقم المصري لصيغة دولية بدون + : 01012345678 → 201012345678
 * لازم تطابق التطبيع اللي على السيرفر بالظبط، وإلا الهاش هيختلف والمطابقة تفشل.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return `20${digits}`;
}

/**
 * المطابقة المتقدمة اليدوية: بنعيد تهيئة البيكسل ببيانات العميل قبل حدث
 * الشراء مباشرة. البيكسل نفسه هو اللي بيهشّرها في المتصفح — إحنا بنبعتها
 * خام وهو بيعمل SHA-256 قبل ما يرسلها، فمفيش بيانات نيّة بتخرج من الجهاز.
 *
 * ده أهم عامل في «جودة مطابقة الحدث» عند ميتا، ومن غيره بتشتكي إن بيانات
 * الأحداث ناقصة.
 */
export function setCustomerMatchData(customer: {
  name?: string;
  phone?: string;
  city?: string;
  governorate?: string;
}) {
  if (!META_PIXEL_ID) return;

  try {
    const phone = customer.phone ? normalizePhone(customer.phone) : "";
    const parts = (customer.name ?? "").trim().split(/\s+/).filter(Boolean);

    const matchData: Record<string, string> = { country: "eg" };
    if (phone) {
      matchData.ph = phone;
      // معرّف ثابت للعميل — نفس القيمة اللي السيرفر بيهشّرها، فبيتطابقوا.
      matchData.external_id = phone;
    }
    if (parts[0]) matchData.fn = parts[0];
    if (parts.length > 1) matchData.ln = parts[parts.length - 1];
    if (customer.city) matchData.ct = customer.city.replace(/\s/g, "").toLowerCase();
    if (customer.governorate) matchData.st = customer.governorate.replace(/\s/g, "").toLowerCase();

    // إعادة init بنفس معرّف البيكسل بتحدّث بيانات المطابقة للأحداث الجاية.
    window.fbq?.("init", META_PIXEL_ID, matchData);
  } catch {
    /* لو حصل أي خطأ نكمل عادي — الحدث نفسه أهم من المطابقة */
  }
}

// ---------------------------------------------------------------------------
// الأحداث
// ---------------------------------------------------------------------------

function meta(event: string, params?: Record<string, unknown>, options?: { eventID?: string }) {
  try {
    window.fbq?.("track", event, params ?? {}, options);
  } catch {
    /* البيكسل ممنوع أو لسه بيتحمّل — مش مشكلة */
  }
}

function tiktok(event: string, params?: Record<string, unknown>, eventId?: string) {
  try {
    // تيك توك بياخد event_id في المعامل التالت عشان يدمج حدث المتصفح مع
    // حدث Events API الجاي من السيرفر.
    window.ttq?.track?.(event, params ?? {}, eventId ? { event_id: eventId } : undefined);
  } catch {
    /* نفس الكلام */
  }
}

/** زيارة صفحة (بيتنادى مع كل تغيير مسار). */
export function trackPageView() {
  try {
    window.fbq?.("track", "PageView");
    window.ttq?.page?.();
  } catch {
    /* تجاهل */
  }
}

/** العميل شاف المنتج. */
export function trackViewContent(item: Contents) {
  const { value, contentId, contentName } = item;
  meta("ViewContent", {
    content_type: "product",
    content_ids: [contentId],
    content_name: contentName,
    value,
    currency: CURRENCY,
  });
  tiktok("ViewContent", {
    contents: [{ content_id: contentId, content_name: contentName, content_type: "product", quantity: 1, price: value }],
    value,
    currency: CURRENCY,
  });
}

/** العميل ضغط «اطلب الآن» ووصل لنموذج الطلب. */
export function trackAddToCart(item: Contents) {
  const { value, qty, contentId, contentName } = item;
  meta("AddToCart", {
    content_type: "product",
    content_ids: [contentId],
    content_name: contentName,
    contents: [{ id: contentId, quantity: qty }],
    value,
    currency: CURRENCY,
  });
  tiktok("AddToCart", {
    contents: [{ content_id: contentId, content_name: contentName, content_type: "product", quantity: qty, price: value / qty }],
    value,
    currency: CURRENCY,
  });
}

/** العميل بدأ يملأ بيانات الطلب فعلًا. */
export function trackInitiateCheckout(item: Contents) {
  const { value, qty, contentId, contentName } = item;
  meta("InitiateCheckout", {
    content_type: "product",
    content_ids: [contentId],
    contents: [{ id: contentId, quantity: qty }],
    num_items: qty,
    value,
    currency: CURRENCY,
  });
  tiktok("InitiateCheckout", {
    contents: [{ content_id: contentId, content_name: contentName, content_type: "product", quantity: qty, price: value / qty }],
    value,
    currency: CURRENCY,
  });
}

/**
 * أهم حدث: الطلب اتأكد.
 *
 * `eventId` جاي من السيرفر، ونفسه بيتبعت لـ Meta Conversions API و
 * TikTok Events API — كده كل منصة بتعرف إن حدث المتصفح وحدث السيرفر حدث
 * واحد وما بتحسبهومش مرتين. راجع server/meta-capi.ts و server/tiktok-events.ts.
 */
export function trackPurchase(item: Contents & { eventId?: string; orderRef: string }) {
  const { value, qty, contentId, contentName, eventId, orderRef } = item;

  meta(
    "Purchase",
    {
      content_type: "product",
      content_ids: [contentId],
      content_name: contentName,
      contents: [{ id: contentId, quantity: qty }],
      num_items: qty,
      value,
      currency: CURRENCY,
      order_id: orderRef,
    },
    eventId ? { eventID: eventId } : undefined,
  );

  tiktok(
    TIKTOK_PURCHASE_EVENT,
    {
      contents: [{ content_id: contentId, content_name: contentName, content_type: "product", quantity: qty, price: value / qty }],
      value,
      currency: CURRENCY,
      order_id: orderRef,
    },
    eventId,
  );
}

/**
 * معرّفات الإعلانات (_fbp و _fbc لميتا، _ttp و ttclid لتيك توك) — بتتبعت مع
 * الطلب للسيرفر عشان الـ Conversions/Events API يقدر يطابق الحدث بنفس الزائر.
 * دي معرّفات المنصات نفسها، مش بيانات شخصية.
 */
export function readAdCookies(): { fbp?: string; fbc?: string; ttp?: string; ttclid?: string } {
  try {
    const read = (name: string) =>
      document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`))
        ?.split("=")
        .slice(1)
        .join("=");

    const fbp = read("_fbp");
    let fbc = read("_fbc");

    // لو الزائر جاي من إعلان لسه، ميتا بتحط fbclid في الرابط قبل ما تكتب الكوكي.
    if (!fbc) {
      const fbclid = new URLSearchParams(window.location.search).get("fbclid");
      if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
    }

    // تيك توك: كوكي _ttp ومعرّف النقرة ttclid من الرابط.
    const ttp = read("_ttp");
    const ttclid = new URLSearchParams(window.location.search).get("ttclid") ?? read("ttclid");

    return {
      ...(fbp ? { fbp } : {}),
      ...(fbc ? { fbc } : {}),
      ...(ttp ? { ttp } : {}),
      ...(ttclid ? { ttclid } : {}),
    };
  } catch {
    return {};
  }
}
