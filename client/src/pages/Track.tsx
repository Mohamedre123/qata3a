/**
 * تتبّع الطلب — العميل بيكتب رقم طلبه ويشوف مرحلته.
 *
 * صفقة مالهاش نقطة API لجلب حالة طلب، فبنعتمد على تحديثات الحالة اللي
 * بيبعتوها على /api/hooks/order وبنخزّنها عندنا (راجع server/order-store.ts).
 * الرد مفيهوش أي بيانات شخصية — رقم الطلب والحالة والإجمالي بس.
 */
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ClipboardList,
  Loader2,
  PackageCheck,
  PackageSearch,
  Search,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "wouter";
import { Footer } from "@/components/SiteChrome";
import { egp } from "@/lib/api";
import { BRAND } from "@/lib/content";

type TrackResult = {
  found: true;
  reference: string;
  label: string;
  note: string;
  stage: number;
  tone: "progress" | "done" | "problem";
  qty: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

const STAGES = [
  { icon: ClipboardList, label: "استلمنا الطلب" },
  { icon: PackageCheck, label: "بنجهّزه" },
  { icon: Truck, label: "في الشحن" },
  { icon: Check, label: "تم التوصيل" },
];

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export default function Track() {
  const [params] = useSearchParams();
  const [reference, setReference] = useState(() => params.get("ref") ?? "");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(ref: string) {
    const trimmed = ref.trim();
    if (trimmed.length < 4) {
      setError("اكتب رقم الطلب كامل زي ما ظهرلك بعد الطلب.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/track?ref=${encodeURIComponent(trimmed)}`);
      const body = await response.json();
      if (!response.ok || !body.found) {
        setResult(null);
        setError(body?.error ?? "مالقيناش طلب بالرقم ده.");
      } else {
        setResult(body as TrackResult);
      }
    } catch {
      setResult(null);
      setError("تعذّر الاتصال. اتأكد من الإنترنت وحاول تاني.");
    } finally {
      setLoading(false);
    }
  }

  // البحث تلقائيًا لو الرقم جه في الرابط (?ref=...)
  useEffect(() => {
    const fromUrl = params.get("ref");
    if (fromUrl) void lookup(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stage = result?.stage ?? 0;
  const problem = result?.tone === "problem";

  return (
    <main dir="rtl" className="flex min-h-screen flex-col bg-ivory text-[#101733]">
      <header className="border-b border-navy/10 bg-white/70 backdrop-blur">
        <div className="shell flex items-center justify-between gap-4 py-3.5">
          <Link href="/" className="flex items-center gap-2.5" aria-label={`${BRAND.name} — الرئيسية`}>
            <span className="brand-mark ring-1 ring-navy/8">
              <img src={BRAND.logo} alt={`شعار ${BRAND.name}`} width={46} height={46} />
            </span>
            <b className="font-display text-lg font-black text-navy">{BRAND.name}</b>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm font-bold text-navy transition-colors hover:text-brand-red">
            الرئيسية
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="shell flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-xl">
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-navy text-white">
              <PackageSearch className="h-6 w-6" />
            </span>
            <h1 className="mt-5 font-display text-2xl font-black leading-[1.5] text-navy sm:text-3xl">
              تتبّع طلبك
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-[#5C6480]">
              اكتب رقم الطلب اللي ظهرلك بعد ما طلبت وهنقولك وصل لفين.
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void lookup(reference);
            }}
            className="mt-7 flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              dir="ltr"
              placeholder="sk-XXXXXXXX"
              aria-label="رقم الطلب"
              className="input flex-1 text-center font-display tracking-wider"
              autoFocus
            />
            <button type="submit" disabled={loading} className="btn btn-navy sm:!px-7">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              تتبّع
            </button>
          </form>

          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-[#FFF1F1] p-3.5 text-sm font-bold text-brand-red">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="card mt-6 overflow-hidden"
            >
              <div className={`px-6 py-5 ${problem ? "bg-[#FFF7ED]" : "bg-[#F3F4FF]"}`}>
                <p className="text-xs font-bold text-[#7A8299]">رقم الطلب</p>
                <p className="mt-1 font-display text-xl font-black tracking-wider text-navy">
                  {result.reference}
                </p>
                <p className={`mt-3 font-display text-lg font-black ${problem ? "text-[#B45309]" : "text-navy"}`}>
                  {result.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#5C6480]">{result.note}</p>
              </div>

              {/* شريط المراحل */}
              {!problem && (
                <div className="border-t border-navy/10 px-6 py-7">
                  <ol className="flex items-start justify-between gap-1">
                    {STAGES.map((item, index) => {
                      const step = index + 1;
                      const done = stage >= step;
                      const Icon = item.icon;
                      return (
                        <li key={item.label} className="relative flex flex-1 flex-col items-center text-center">
                          {index > 0 && (
                            <span
                              aria-hidden
                              className={`absolute right-1/2 top-5 h-[3px] w-full ${
                                stage >= step ? "bg-[#16A34A]" : "bg-navy/12"
                              }`}
                            />
                          )}
                          <span
                            className={`relative z-10 grid h-10 w-10 place-items-center rounded-full transition-colors ${
                              done ? "bg-[#16A34A] text-white" : "bg-white text-navy/30 ring-2 ring-navy/12"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span
                            className={`mt-2 text-[11px] font-bold leading-4 ${
                              done ? "text-navy" : "text-[#9AA3B4]"
                            }`}
                          >
                            {item.label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              <dl className="grid grid-cols-2 gap-px border-t border-navy/10 bg-navy/10 text-sm">
                {[
                  ["الكمية", String(result.qty)],
                  ["الإجمالي", egp(result.total)],
                  ["تاريخ الطلب", formatDate(result.createdAt)],
                  ["آخر تحديث", formatDate(result.updatedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="bg-white px-5 py-4">
                    <dt className="text-xs font-bold text-[#7A8299]">{label}</dt>
                    <dd className="mt-1 font-bold text-navy">{value}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          )}

          <div className="mt-8 rounded-2xl border border-navy/10 bg-white p-5 text-sm leading-7 text-[#5C6480]">
            <b className="block font-display text-navy">مش لاقي رقم طلبك؟</b>
            الرقم بيظهرلك على طول بعد ما تضغط «تأكيد الطلب». لو ضاع منك، احنا بنكلّمك
            على رقم الموبايل اللي كتبته لتأكيد الطلب — استنانا نكلّمك.
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="btn btn-ghost">
              العودة للصفحة الرئيسية
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
