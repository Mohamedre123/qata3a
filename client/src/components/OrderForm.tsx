/**
 * نموذج الطلب — يقرأ المحافظات والمدن وأسعار الشحن الحقيقية من صفقة
 * (عبر /api/shipping)، ويُرسل الطلب إلى /api/orders الذي ينشئه على صفقة.
 */
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BadgeCheck,
  Check,
  Loader2,
  Lock,
  MapPin,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  DEFAULT_PRICING,
  egp,
  submitOrder,
  useShipping,
  type OrderResult,
  type Pricing,
} from "@/lib/api";
import { PRODUCT_NAME, productImages } from "@/lib/content";

type Errors = Partial<Record<"name" | "phone1" | "phone2" | "address" | "governorateId", string>>;

const AR_DIGITS = /[٠-٩]/g;
const toLatinDigits = (value: string) =>
  value.replace(AR_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660));

const isPhone = (value: string) => /^01[0125]\d{8}$/.test(value);

export default function OrderForm({
  pricing = DEFAULT_PRICING,
  compact = false,
}: {
  pricing?: Pricing;
  compact?: boolean;
}) {
  const { data: shipping, loading: shippingLoading } = useShipping();

  const [name, setName] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [address, setAddress] = useState("");
  const [governorateId, setGovernorateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<OrderResult | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);

  const governorates = shipping?.governorates ?? [];
  const selectedGov = useMemo(
    () => governorates.find((row) => row.id === governorateId) ?? null,
    [governorates, governorateId],
  );
  const cities = selectedGov?.cities ?? [];

  // إعادة ضبط المدينة عند تغيير المحافظة.
  useEffect(() => setCityId(""), [governorateId]);

  const subtotal = pricing.sell * qty;
  const shippingCost = selectedGov?.price ?? null;
  const total = subtotal + (shippingCost ?? 0);
  const saved = Math.max(0, pricing.compareAt - pricing.sell) * qty;

  useEffect(() => {
    if (result) successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [result]);

  function validate(): Errors {
    const next: Errors = {};
    if (name.trim().length < 3) next.name = "اكتب اسمك بالكامل";
    if (!isPhone(phone1)) next.phone1 = "رقم غير صحيح — مثال: 01012345678";
    if (phone2 && !isPhone(phone2)) next.phone2 = "الرقم الاحتياطي غير صحيح";
    if (address.trim().length < 8) next.address = "اكتب العنوان بالتفصيل (المنطقة والشارع ورقم العقار)";
    if (!governorateId) next.governorateId = "اختر المحافظة";
    return next;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFailure(null);

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      const firstKey = Object.keys(found)[0];
      document.querySelector<HTMLElement>(`[name="${firstKey}"]`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const response = await submitOrder({
        name: name.trim(),
        phone1,
        phone2: phone2 || undefined,
        address: address.trim(),
        governorateId,
        cityId: cityId || undefined,
        qty,
        note: note.trim() || undefined,
      });
      setResult(response);
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? error.message
          : "تعذّر إرسال الطلب. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------- النجاح
  if (result) {
    return (
      <motion.div
        ref={successRef}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="card grid-lines p-7 text-center sm:p-10"
      >
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 16 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#16A34A] text-white shadow-[0_16px_34px_-12px_rgba(22,163,74,.7)]"
        >
          <Check className="h-10 w-10" strokeWidth={3} />
        </motion.span>

        <h3 className="mt-6 font-display text-3xl font-black text-navy">تم استلام طلبك ✅</h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#5C6480]">
          هنكلمك على الرقم <b className="text-navy">{phone1}</b> خلال ٢٤ ساعة لتأكيد الطلب والعنوان.
          الدفع عند الاستلام.
        </p>

        <div className="mx-auto mt-6 w-full max-w-sm rounded-2xl border border-navy/10 bg-[#F7F5FF] p-5 text-right">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-[#5C6480]">رقم الطلب</span>
            <b className="font-display text-lg tracking-wider text-navy">{result.reference}</b>
          </div>
          <div className="divider-dashed my-4" />
          <dl className="space-y-2 text-sm text-[#5C6480]">
            <div className="flex justify-between">
              <dt>{PRODUCT_NAME} × {result.summary.qty}</dt>
              <dd className="font-bold text-navy">{egp(result.summary.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>الشحن</dt>
              <dd className="font-bold text-navy">{egp(result.summary.shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-navy/10 pt-3 font-display text-lg font-black text-navy">
              <dt>الإجمالي</dt>
              <dd>{egp(result.summary.total)}</dd>
            </div>
          </dl>
        </div>

        <p className="mt-5 text-xs font-bold text-[#7A8299]">
          احتفظ برقم الطلب للرجوع إليه عند الاستفسار.
        </p>
      </motion.div>
    );
  }

  // ---------------------------------------------------------------- النموذج
  return (
    <form onSubmit={handleSubmit} noValidate className="card grid-lines overflow-hidden">
      <div className="border-b border-navy/10 bg-white/60 px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex items-center gap-2">
          <span className="dot-live" />
          <span className="text-xs font-extrabold text-[#16A34A]">الطلب متاح الآن</span>
        </div>
        <h3 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
          اطلب دلوقتي — الدفع عند الاستلام
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#5C6480]">
          اكتب بياناتك وهنتواصل معاك للتأكيد. مش هتدفع أي حاجة قبل ما تستلم.
        </p>
      </div>

      <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="field">
            <span>الاسم بالكامل <em>*</em></span>
            <div className="relative">
              <User className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
              <input
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => setErrors((prev) => ({ ...prev, name: validate().name }))}
                aria-invalid={Boolean(errors.name)}
                autoComplete="name"
                placeholder="مثال: أحمد محمد"
                className="input pr-10"
              />
            </div>
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>

          <label className="field">
            <span>رقم الموبايل <em>*</em></span>
            <div className="relative">
              <Phone className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
              <input
                name="phone1"
                value={phone1}
                onChange={(event) => setPhone1(toLatinDigits(event.target.value).replace(/\D/g, "").slice(0, 11))}
                onBlur={() => setErrors((prev) => ({ ...prev, phone1: validate().phone1 }))}
                aria-invalid={Boolean(errors.phone1)}
                inputMode="numeric"
                autoComplete="tel"
                dir="ltr"
                placeholder="01012345678"
                className="input pr-10 text-right"
              />
            </div>
            {errors.phone1 && <span className="field-error">{errors.phone1}</span>}
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="field">
            <span>المحافظة <em>*</em></span>
            <div className="relative">
              <MapPin className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
              <select
                name="governorateId"
                value={governorateId}
                onChange={(event) => setGovernorateId(event.target.value)}
                aria-invalid={Boolean(errors.governorateId)}
                disabled={shippingLoading}
                className="input pr-10"
              >
                <option value="" disabled>
                  {shippingLoading ? "جارٍ تحميل المحافظات…" : "اختر المحافظة"}
                </option>
                {governorates.map((gov) => (
                  <option key={gov.id} value={gov.id}>
                    {gov.nameAr} — شحن {gov.price} ج
                  </option>
                ))}
              </select>
            </div>
            {errors.governorateId && <span className="field-error">{errors.governorateId}</span>}
          </label>

          <label className="field">
            <span>المركز / المدينة</span>
            <select
              name="cityId"
              value={cityId}
              onChange={(event) => setCityId(event.target.value)}
              disabled={!cities.length}
              className="input"
            >
              <option value="">{cities.length ? "اختر المدينة (اختياري)" : "اختر المحافظة أولًا"}</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.nameAr}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>العنوان بالتفصيل <em>*</em></span>
          <textarea
            name="address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            onBlur={() => setErrors((prev) => ({ ...prev, address: validate().address }))}
            aria-invalid={Boolean(errors.address)}
            autoComplete="street-address"
            rows={3}
            placeholder="المنطقة، اسم الشارع، رقم العقار، الدور، وأقرب علامة مميزة"
            className="input"
          />
          {errors.address && <span className="field-error">{errors.address}</span>}
        </label>

        {!compact && (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="field">
              <span>رقم احتياطي (اختياري)</span>
              <input
                name="phone2"
                value={phone2}
                onChange={(event) => setPhone2(toLatinDigits(event.target.value).replace(/\D/g, "").slice(0, 11))}
                aria-invalid={Boolean(errors.phone2)}
                inputMode="numeric"
                dir="ltr"
                placeholder="01198765432"
                className="input text-right"
              />
              {errors.phone2 && <span className="field-error">{errors.phone2}</span>}
            </label>

            <label className="field">
              <span>ملاحظات للمندوب (اختياري)</span>
              <input
                name="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="مثال: الاتصال قبل الوصول"
                className="input"
              />
            </label>
          </div>
        )}

        {/* الكمية */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-navy/10 bg-white p-4">
          <div>
            <p className="font-display text-sm font-extrabold text-navy">الكمية</p>
            <p className="mt-0.5 text-xs text-[#7A8299]">{egp(pricing.sell)} للقطعة</p>
          </div>
          <div className="qty">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="إنقاص الكمية">
              <Minus className="h-4 w-4" />
            </button>
            <span aria-live="polite">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(pricing.maxQty, q + 1))}
              disabled={qty >= pricing.maxQty}
              aria-label="زيادة الكمية"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* طريقة الدفع */}
        <div className="pay-option" data-selected="true">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-navy text-white">
            <Truck className="h-4 w-4" />
          </span>
          <span className="flex-1">
            <b className="block font-display text-sm text-navy">الدفع عند الاستلام</b>
            <small className="text-xs text-[#7A8299]">تدفع للمندوب لما تستلم شحنتك</small>
          </span>
          <BadgeCheck className="h-5 w-5 text-[#16A34A]" />
        </div>

        {/* الملخّص */}
        <div className="rounded-2xl bg-[#F3F4FF] p-5">
          <div className="flex items-center gap-3">
            <img
              src={productImages[0].src}
              alt={PRODUCT_NAME}
              width={48}
              height={48}
              loading="lazy"
              className="h-12 w-12 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-extrabold text-navy">{PRODUCT_NAME}</p>
              <p className="text-xs text-[#7A8299]">الكمية: {qty}</p>
            </div>
          </div>

          <div className="divider-dashed my-4" />

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between text-[#5C6480]">
              <dt>سعر المنتج</dt>
              <dd className="font-bold text-navy">{egp(subtotal)}</dd>
            </div>
            {saved > 0 && (
              <div className="flex justify-between text-[#16A34A]">
                <dt>وفّرت</dt>
                <dd className="font-bold">{egp(saved)}</dd>
              </div>
            )}
            <div className="flex justify-between text-[#5C6480]">
              <dt>الشحن</dt>
              <dd className="font-bold text-navy">
                {shippingCost === null ? (
                  <span className="text-xs font-bold text-[#7A8299]">اختر المحافظة</span>
                ) : (
                  egp(shippingCost)
                )}
              </dd>
            </div>
            <div className="flex items-end justify-between border-t border-navy/12 pt-3">
              <dt className="font-display text-base font-black text-navy">الإجمالي</dt>
              <dd className="font-display text-2xl font-black text-brand-red">
                {shippingCost === null ? egp(subtotal) : egp(total)}
              </dd>
            </div>
          </dl>
        </div>

        <AnimatePresence>
          {failure && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              role="alert"
              className="flex items-start gap-2 overflow-hidden rounded-xl bg-[#FFF1F1] p-3 text-sm font-bold text-brand-red"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {failure}
            </motion.p>
          )}
        </AnimatePresence>

        <button type="submit" disabled={submitting} className="btn btn-primary btn-lg btn-block">
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              جارٍ إرسال الطلب…
            </>
          ) : (
            <>
              <ShoppingBag className="h-5 w-5" />
              تأكيد الطلب — {shippingCost === null ? egp(subtotal) : egp(total)}
            </>
          )}
        </button>

        <p className="flex items-center justify-center gap-2 text-center text-xs font-bold text-[#7A8299]">
          <Lock className="h-3.5 w-3.5" />
          بياناتك تُستخدم لتوصيل الطلب فقط
          <span className="text-navy/20">•</span>
          <ShieldCheck className="h-3.5 w-3.5" />
          بدون أي دفع مقدم
        </p>
      </div>
    </form>
  );
}
