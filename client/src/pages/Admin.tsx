/**
 * صفحة الإعداد والربط (/admin).
 *
 * الغرض منها: تشرح خطوة بخطوة إزاي تربط الموقع بحساب صفقة، وتعطيك
 * القيم الجاهزة للنسخ في نافذة «إنشاء مفتاح» على لوحة صفقة، ثم تعرض
 * حالة الربط وآخر الطلبات.
 *
 * محميّة بـ ADMIN_TOKEN من ملف .env.
 */
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Link2,
  Package,
  RefreshCw,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { egp } from "@/lib/api";
import { BRAND } from "@/lib/content";

type Status = {
  connected: boolean;
  keySource: "env" | "callback" | null;
  keyPreview: string | null;
  keyName: string | null;
  hooks: { product: string | null; order: string | null };
  productId: string;
  sellPrice: number;
  compareAtPrice: number;
  serverless?: boolean;
  ordersWebhook?: boolean;
  commissionPerUnit?: number;
  governorates: number;
  error?: string;
  product: {
    name: string;
    barcode?: string;
    basePrice: number;
    propertyId: string | null;
    propertyName: string | null;
    minPrice: number | null;
  } | null;
};

type OrderRow = {
  ref: string;
  created_at: string;
  customer: { name: string; phone1: string; governorateName: string; cityName: string };
  qty: number;
  total: number;
  synced: boolean;
  error: string | null;
};

const TOKEN_KEY = "qataaty_admin_token";

function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* المتصفح رفض الوصول للحافظة — المستخدم يقدر ينسخ يدويًا */
    }
  };

  return (
    <div className="rounded-xl border border-navy/12 bg-white p-3.5">
      <div className="flex items-center justify-between gap-3">
        <b className="font-display text-xs font-extrabold text-navy">{label}</b>
        <button
          onClick={copy}
          className={`badge-soft shrink-0 transition-colors ${
            copied ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F3F4FF] text-navy hover:bg-[#E6E8FF]"
          }`}
        >
          {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "تم النسخ" : "نسخ"}
        </button>
      </div>
      <code dir="ltr" className="mt-2 block overflow-x-auto whitespace-nowrap rounded-lg bg-[#F7F6F2] px-3 py-2 text-left text-xs text-[#3B4463]">
        {value || "—"}
      </code>
      {hint && <p className="mt-2 text-xs leading-6 text-[#7A8299]">{hint}</p>}
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [draftToken, setDraftToken] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const hooks = useMemo(
    () => ({
      product: `${origin}/api/hooks/product`,
      order: `${origin}/api/hooks/order`,
      callback: `${origin}/api/safka/callback`,
    }),
    [origin],
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setAuthError(null);

    try {
      const [statusRes, ordersRes] = await Promise.all([
        fetch(`/api/admin/status?token=${encodeURIComponent(token)}`),
        fetch(`/api/admin/orders?token=${encodeURIComponent(token)}`),
      ]);

      if (!statusRes.ok) {
        const body = await statusRes.json().catch(() => null);
        setAuthError(body?.error ?? "تعذّر تحميل الحالة.");
        setStatus(null);
        return;
      }

      setStatus(await statusRes.json());
      setOrders(ordersRes.ok ? (await ordersRes.json()).orders ?? [] : []);
    } catch (error) {
      setAuthError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // ------------------------------------------------------------ بوابة الدخول
  if (!token) {
    return (
      <main dir="rtl" className="grid min-h-screen place-items-center bg-ivory p-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            localStorage.setItem(TOKEN_KEY, draftToken.trim());
            setToken(draftToken.trim());
          }}
          className="card w-full max-w-sm p-7"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-navy text-white">
            <KeyRound className="h-5 w-5" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-black leading-[1.5] text-navy">لوحة إعداد {BRAND.name}</h1>
          <p className="mt-2 text-sm leading-7 text-[#5C6480]">
            اكتب <code className="rounded bg-[#F3F4FF] px-1.5 py-0.5 text-xs">ADMIN_TOKEN</code> الموجود
            في ملف <code className="rounded bg-[#F3F4FF] px-1.5 py-0.5 text-xs">.env</code>.
          </p>
          <input
            value={draftToken}
            onChange={(event) => setDraftToken(event.target.value)}
            type="password"
            dir="ltr"
            placeholder="ADMIN_TOKEN"
            className="input mt-5 text-left"
            autoFocus
          />
          <button type="submit" className="btn btn-navy btn-block mt-4">دخول</button>
        </form>
      </main>
    );
  }

  const connected = Boolean(status?.connected);

  return (
    <main dir="rtl" className="min-h-screen bg-ivory pb-20 text-[#101733]">
      <header className="border-b border-navy/10 bg-white">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <span className="brand-mark ring-1 ring-navy/8">
              <img src={BRAND.logo} alt="" width={46} height={46} />
            </span>
            <div>
              <b className="block font-display text-lg font-black text-navy">لوحة الإعداد</b>
              <small className="text-xs text-[#7A8299]">ربط {BRAND.name} بمنصة صفقة</small>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading} className="btn btn-ghost !py-2.5 text-sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              تحديث
            </button>
            <button
              onClick={() => {
                localStorage.removeItem(TOKEN_KEY);
                setToken("");
              }}
              className="btn btn-ghost !py-2.5 text-sm"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="shell space-y-7 py-8">
        {authError && (
          <p className="flex items-center gap-2 rounded-2xl bg-[#FFF1F1] p-4 text-sm font-bold text-brand-red">
            <XCircle className="h-5 w-5 shrink-0" />
            {authError}
          </p>
        )}

        {/* ---------------------------------------------------------- الحالة */}
        <section
          className={`card flex flex-wrap items-center gap-4 p-5 ${
            connected ? "!border-[#16A34A]/35 bg-[#F3FDF6]" : "!border-[#F5A524]/45 bg-[#FFFBEB]"
          }`}
        >
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white ${
              connected ? "bg-[#16A34A]" : "bg-[#F5A524]"
            }`}
          >
            {connected ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </span>
          <div className="min-w-0 flex-1">
            <b className="font-display text-lg font-black text-navy">
              {connected ? "الموقع مربوط بمنصة صفقة ✅" : "الموقع لسه مش مربوط"}
            </b>
            <p className="mt-1 text-sm leading-6 text-[#5C6480]">
              {connected
                ? `المفتاح مصدره: ${status?.keySource === "env" ? "ملف .env" : "callback من صفقة"} • ${status?.keyPreview}`
                : "الطلبات دلوقتي بتتسجّل محليًا فقط ومش بتوصل لصفقة. اتبع الخطوات تحت."}
            </p>
            {status?.error && <p className="mt-1 text-xs font-bold text-brand-red">{status.error}</p>}
          </div>
        </section>

        {/* -------------------------------------------------- خطوات الربط */}
        <section className="card p-6 sm:p-7">
          <h2 className="font-display text-xl font-black text-navy">خطوات الربط</h2>
          <p className="mt-2 text-sm leading-7 text-[#5C6480]">
            فيه طريقتين — اختار اللي يريحك. الطريقة الأولى أسهل لأن صفقة بتبعتلنا المفتاح
            لوحدها وبنحفظه تلقائيًا.
          </p>

          {/* الطريقة الأولى */}
          <div className="mt-6 rounded-2xl border-2 border-navy/15 bg-[#F8F8FF] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge-soft bg-navy text-white">الطريقة ١ — تلقائية (مُوصى بها)</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-[#4C5573]">
              اضغط الزر تحت. هيوديك لصفحة الموافقة على صفقة باسم <b>{BRAND.name}</b> وكل الروابط
              متملية تلقائيًا. بعد ما تضغط «سماح»، صفقة هتبعت المفتاح لموقعنا وهيتحفظ لوحده،
              وترجع هنا تلاقي الحالة اتغيّرت لـ«مربوط».
            </p>
            <a href="/api/safka/connect" className="btn btn-primary mt-5">
              <Link2 className="h-4 w-4" />
              اربط الموقع بحساب صفقة
              <ExternalLink className="h-4 w-4" />
            </a>
            {!origin.startsWith("https://") && (
              <p className="mt-3 flex items-start gap-2 text-xs font-bold leading-6 text-[#B45309]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                إنت شغّال على {origin}. صفقة مش هتقدر توصل لروابط localhost — الربط التلقائي
                هيشتغل بعد ما ترفع الموقع على دومين HTTPS. لحد ساعتها استخدم الطريقة ٢.
              </p>
            )}
          </div>

          {/* الطريقة الثانية */}
          <div className="mt-5 rounded-2xl border border-navy/12 p-5">
            <span className="badge-soft bg-[#F3F4FF] text-navy">الطريقة ٢ — يدوية من لوحة صفقة</span>
            <p className="mt-3 text-sm leading-7 text-[#4C5573]">
              من لوحة صفقة افتح «التكاملات ← مفاتيح API ← إنشاء مفتاح»، واملأ الخانات بالقيم دي
              بالظبط، وبعدين انسخ المفتاح اللي هيظهرلك <b>مرة واحدة بس</b> وحطه في{" "}
              <code className="rounded bg-[#F3F4FF] px-1.5 py-0.5 text-xs">SAFKA_API_KEY</code> في ملف{" "}
              <code className="rounded bg-[#F3F4FF] px-1.5 py-0.5 text-xs">.env</code> ثم أعد تشغيل الموقع.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <CopyField label="الاسم" value={BRAND.name} hint="اسم توضيحي يميّز المفتاح عن غيره." />
              <CopyField
                label="Callback API"
                value={hooks.callback}
                hint="صفقة هتبعت المفتاح هنا مرة واحدة بعد الإنشاء — وهو اللي بيخلّي الربط تلقائي."
              />
              <CopyField
                label="هوك المنتج (productHook)"
                value={hooks.product}
                hint="صفقة بتبعت هنا بيانات المنتج لما تدفعه لموقعنا."
              />
              <CopyField
                label="هوك الطلبات (orderHook)"
                value={hooks.order}
                hint="صفقة بتبعت هنا تحديثات حالة الطلب (تحضير، شحن، توصيل…)."
              />
            </div>

            <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#FFFBEB] p-3 text-xs font-bold leading-6 text-[#B45309]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              في الاسكرين اللي عندك كانت الخانات متملية بروابط aff.safka-eg.com — دي روابط منصة
              صفقة نفسها مش روابطنا. لازم تحط الروابط اللي فوق (روابط موقعك) عشان صفقة تعرف
              توصلك بالتحديثات.
            </p>
          </div>
        </section>

        {/* ----------------------------------------------- المنتج والتسعير */}
        <section className="grid gap-5 md:grid-cols-2">
          <div className="card p-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-navy" />
              <h2 className="font-display text-lg font-black text-navy">المنتج على صفقة</h2>
            </div>

            {status?.product ? (
              <dl className="mt-5 space-y-3 text-sm">
                {[
                  ["الاسم", status.product.name],
                  ["الباركود", status.product.barcode ?? "—"],
                  ["سعر المنتج عندهم (تكلفتك)", egp(status.product.basePrice)],
                  ["سعر بيعك للعميل", egp(status.sellPrice)],
                  ["عمولتك للقطعة", egp(status.commissionPerUnit ?? 0)],
                  ["الخاصية المختارة", status.product.propertyName ?? status.product.propertyId ?? "—"],
                  ["أقل سعر بيع مسموح", status.product.minPrice ? egp(status.product.minPrice) : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-navy/8 pb-2.5 last:border-0">
                    <dt className="text-[#7A8299]">{label}</dt>
                    <dd className="text-left font-bold text-navy">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[#7A8299]">
                هتظهر بيانات المنتج هنا بعد إتمام الربط.
                <br />
                <span className="text-xs">معرّف المنتج الحالي: </span>
                <code dir="ltr" className="rounded bg-[#F3F4FF] px-1.5 py-0.5 text-xs">{status?.productId}</code>
              </p>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-navy" />
              <h2 className="font-display text-lg font-black text-navy">الشحن والتسعير</h2>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              {[
                ["عدد المحافظات المتاحة", status?.governorates ? `${status.governorates} محافظة` : "—"],
                ["سعر البيع", egp(status?.sellPrice ?? 0)],
                ["السعر قبل الخصم", egp(status?.compareAtPrice ?? 0)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-navy/8 pb-2.5 last:border-0">
                  <dt className="text-[#7A8299]">{label}</dt>
                  <dd className="font-bold text-navy">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-6 text-[#7A8299]">
              لتغيير السعر عدّل <code className="rounded bg-[#F3F4FF] px-1.5 py-0.5">SELL_PRICE</code> في
              ملف <code className="rounded bg-[#F3F4FF] px-1.5 py-0.5">.env</code> ثم أعد تشغيل الموقع.
              العمولة بتتحسب لوحدها = سعر بيعك − سعر المنتج على صفقة.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------- الطلبات */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-navy/10 p-5">
            <h2 className="font-display text-lg font-black text-navy">آخر الطلبات</h2>
            <span className="badge-soft bg-[#F3F4FF] text-navy">{orders.length}</span>
          </div>

          {status?.serverless && (
            <p className="flex items-start gap-2 border-b border-navy/8 bg-[#FFFBEB] p-4 text-xs font-bold leading-6 text-[#B45309]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              الموقع شغّال على استضافة serverless (زي Vercel) — نظام الملفات مؤقّت،
              فالجدول ده غالبًا هيفضل فاضي. مصدر الطلبات الحقيقي هو لوحة صفقة، وكل
              طلب بيتطبع كمان في سجلّات الاستضافة.
              {!status.ordersWebhook && " اضبط ORDERS_WEBHOOK_URL لو عايز سجل دائم عندك."}
            </p>
          )}

          {orders.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#7A8299]">لا توجد طلبات بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-right text-sm">
                <thead className="bg-[#F7F6F2] text-xs font-extrabold text-[#7A8299]">
                  <tr>
                    {["الرقم", "العميل", "الموبايل", "المحافظة", "الكمية", "الإجمالي", "الحالة"].map((head) => (
                      <th key={head} className="px-4 py-3 font-extrabold">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.ref + order.created_at} className="border-t border-navy/8">
                      <td className="px-4 py-3 font-mono text-xs text-navy">{order.ref}</td>
                      <td className="px-4 py-3 font-bold text-navy">{order.customer?.name}</td>
                      <td dir="ltr" className="px-4 py-3 text-right text-[#5C6480]">{order.customer?.phone1}</td>
                      <td className="px-4 py-3 text-[#5C6480]">{order.customer?.governorateName || "—"}</td>
                      <td className="px-4 py-3 text-[#5C6480]">{order.qty}</td>
                      <td className="px-4 py-3 font-bold text-navy">{egp(order.total)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge-soft ${
                            order.synced ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FFF1F1] text-brand-red"
                          }`}
                          title={order.error ?? undefined}
                        >
                          {order.synced ? "وصل لصفقة" : "محلي فقط"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
