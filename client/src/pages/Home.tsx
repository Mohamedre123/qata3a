/**
 * صفحة الهبوط الرئيسية لـ«قطاعتي».
 *
 * السعر وبيانات المنتج تأتي من /api/storefront (المصدر: منصة صفقة)،
 * ونموذج الطلب في آخر الصفحة يُنشئ الطلب فعليًا على صفقة عبر /api/orders.
 */
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Hand,
  Maximize2,
  Quote,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  Wind,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OrderForm from "@/components/OrderForm";
import Reveal from "@/components/Reveal";
import { Footer, Header, MobileOrderBar, TopBar } from "@/components/SiteChrome";
import { egp, useStorefront } from "@/lib/api";
import {
  PRODUCT_NAME,
  comparison,
  defaultFaq,
  features,
  productImages,
  reviews,
  specs,
  trustPoints,
} from "@/lib/content";

const featureIcons = { sparkles: Sparkles, wind: Wind, hand: Hand, shield: ShieldCheck } as const;

export default function Home() {
  const { data: storefront, pricing } = useStorefront();
  const reduce = useReducedMotion();

  const [activePhoto, setActivePhoto] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroImageY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "12%"]);

  const scrollToOrder = useCallback(() => {
    document.getElementById("order")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // أسئلة المنتج من صفقة لو موجودة، وإلا الأسئلة الافتراضية.
  const faqItems = useMemo(() => {
    const fromApi = storefront?.product?.faqs ?? [];
    return fromApi.length ? fromApi.map((f) => ({ question: f.question, answer: f.answer })) : defaultFaq;
  }, [storefront]);

  // إغلاق المعاينة المكبّرة بزر Escape.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setLightbox(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  return (
    <main dir="rtl" className="min-h-screen bg-ivory text-[#101733]">
      <TopBar pricing={pricing} />
      <Header onOrder={scrollToOrder} />

      {/* ================================================================= بطل */}
      <section ref={heroRef} className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-red/8 blur-3xl sm:h-96 sm:w-96"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-64 h-80 w-80 rounded-full bg-navy/8 blur-3xl"
        />

        <div className="shell grid items-center gap-10 py-10 lg:grid-cols-[1.02fr_1fr] lg:gap-16 lg:py-16">
          {/* النص */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 order-1"
          >
            <span className="kicker">{PRODUCT_NAME}</span>

            <h1 className="mt-5 font-display text-[clamp(2.35rem,8vw,4.6rem)] font-black leading-[1.32] tracking-[-.035em] text-navy">
              مساحة نضيفة.
              <span className="block text-brand-red">تحضير أهدأ.</span>
            </h1>

            <p className="mt-5 max-w-[30rem] text-[.98rem] leading-8 text-[#4C5573] sm:text-lg">
              لوح تقطيع ستانلس ستيل ما بيمتصش الروائح ولا بيتخدش زي البلاستيك. سطح واحد
              للّحمة والخضار والعجين — وشطفة مية بتخلّيه زي الجديد.
            </p>

            {/* السعر */}
            <div className="mt-7 flex flex-wrap items-end gap-x-5 gap-y-3">
              <div className="flex items-end gap-2">
                <motion.span
                  key={pricing.sell}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="font-display text-[3.4rem] font-black leading-none tracking-[-.05em] text-navy sm:text-6xl"
                >
                  {pricing.sell}
                </motion.span>
                <span className="mb-2 font-display text-lg font-extrabold text-navy">جنيه</span>
              </div>

              <div className="mb-1.5 border-r-2 border-navy/12 pr-4">
                <s className="text-sm font-bold text-steel">{egp(pricing.compareAt)}</s>
                <p className="mt-0.5 text-xs font-extrabold text-brand-red">
                  وفّر {pricing.save} جنيه
                </p>
              </div>

              <span className="badge-soft mb-2 bg-[#DCFCE7] text-[#15803D]">
                <Truck className="h-3.5 w-3.5" />
                الدفع عند الاستلام
              </span>
            </div>

            {/* الأزرار */}
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={scrollToOrder} className="btn btn-primary btn-lg btn-pulse">
                <ShoppingBag className="h-5 w-5" />
                اطلب لوحك الآن
                <ArrowLeft className="h-5 w-5" />
              </button>
              <a href="#features" className="btn btn-ghost btn-lg">
                اعرف المزيد
                <ChevronDown className="h-4 w-4" />
              </a>
            </div>

            {/* نقاط ثقة */}
            <ul className="mt-8 grid gap-2.5 text-sm font-bold text-[#4C5573] sm:grid-cols-2">
              {["شحن لكل محافظات مصر", "استبدال خلال ٧ أيام", "ستانلس ستيل أصلي", "بدون أي دفع مقدم"].map(
                (item, index) => (
                  <Reveal key={item} delay={0.35 + index * 0.06} direction="right" className="flex items-center gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy text-white">
                      <Check className="h-3 w-3" strokeWidth={3.5} />
                    </span>
                    {item}
                  </Reveal>
                ),
              )}
            </ul>
          </motion.div>

          {/* الصورة */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="relative order-2"
          >
            <div className="hero-frame sheen aspect-[4/5] sm:aspect-[5/5] lg:aspect-[4/5]">
              <motion.img
                style={{ y: heroImageY }}
                src={productImages[0].src}
                alt={productImages[0].alt}
                width={1200}
                height={1600}
                fetchPriority="high"
                className="scale-105 object-[58%_center]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/70 via-transparent to-transparent" />

              <button
                onClick={() => {
                  setActivePhoto(0);
                  setLightbox(true);
                }}
                className="absolute bottom-4 left-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/12 text-white backdrop-blur-md transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:left-6"
                aria-label="تكبير صورة المنتج"
              >
                <Maximize2 className="h-4 w-4" />
              </button>

              <div className="absolute bottom-5 right-5 z-10 text-white sm:bottom-7 sm:right-7">
                <p className="font-display text-sm font-extrabold sm:text-base">إصدار الستانلس</p>
                <p className="mt-0.5 text-xs text-white/70">لتحضير يومي مرتّب</p>
              </div>
            </div>

            {/* ختم الخصم */}
            <motion.div
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: -9 }}
              transition={{ delay: 0.55, type: "spring", stiffness: 180, damping: 13 }}
              className="stamp absolute -top-3 right-3 h-[86px] w-[86px] sm:-top-5 sm:right-6 sm:h-[104px] sm:w-[104px]"
            >
              <small>وفّر</small>
              <b className="text-[1.7rem] sm:text-[2.1rem]">{pricing.save}</b>
              <small>جنيه</small>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================= شريط الطمأنة */}
      <div className="border-y border-navy/10 bg-white py-3.5">
        <div className="marquee">
          <div className="marquee-track">
            {[0, 1].map((copy) => (
              <div key={copy} className="marquee-group" aria-hidden={copy === 1}>
                {trustPoints.map((point) => (
                  <span key={point} className="flex items-center gap-2 whitespace-nowrap text-sm font-bold text-navy">
                    <Check className="h-4 w-4 shrink-0 text-brand-red" strokeWidth={3} />
                    {point}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================= المميزات */}
      <section id="features" className="section-pad relative overflow-hidden bg-navy text-white">
        <div aria-hidden className="absolute inset-0 grid-lines-light" />
        <div className="shell relative">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <Reveal className="max-w-xl">
              <span className="kicker !text-[#FF8E91]">ليه قطاعتي؟</span>
              <h2 className="mt-4 font-display text-[clamp(1.9rem,5.5vw,3rem)] font-black leading-[1.3] tracking-[-.025em]">
                أربع تفاصيل بتفرق
                <br />
                في مطبخك كل يوم.
              </h2>
            </Reveal>
            <Reveal delay={0.12} className="max-w-xs border-r-2 border-brand-red pr-4">
              <p className="text-sm leading-7 text-white/70">
                اخترنا الستانلس مش عشان شكله بس — عشان هو الخامة الوحيدة اللي بتفضل نضيفة
                فعلًا بعد شهور استخدام.
              </p>
            </Reveal>
          </div>

          <div className="mt-11 grid gap-px overflow-hidden rounded-2xl bg-white/12 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = featureIcons[feature.icon as keyof typeof featureIcons];
              return (
                <Reveal
                  key={feature.number}
                  delay={index * 0.08}
                  className="group relative bg-navy p-6 transition-colors duration-300 hover:bg-[#161B7F] sm:p-7"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-display text-xs font-black tracking-[.16em] text-[#FF8E91]">
                      {feature.number}
                    </span>
                    <Icon className="h-6 w-6 text-white/85 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="mt-10 font-display text-xl font-extrabold leading-[1.45]">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/65">{feature.text}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================== المقارنة */}
      <section id="compare" className="section-pad bg-sand">
        <div className="shell">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="kicker justify-center">قبل ما تقرر</span>
            <h2 className="h-section mt-4">ستانلس ولا بلاستيك؟</h2>
            <p className="mt-4 text-sm leading-7 text-[#4C5573] sm:text-base">
              الفرق مش في الشكل — الفرق في اللي بيفضل في اللوح بعد شهر استخدام.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mx-auto mt-9 max-w-3xl overflow-hidden rounded-2xl border border-navy/10 bg-white">
            <div className="compare-row border-b border-navy/10 bg-navy text-white">
              <div className="font-display text-xs font-extrabold sm:text-sm">المعيار</div>
              <div className="text-center font-display text-xs font-extrabold sm:text-sm">قطاعتي</div>
              <div className="text-center font-display text-xs font-extrabold text-white/60 sm:text-sm">
                البلاستيك / الخشب
              </div>
            </div>

            {comparison.rows.map(([label, ours, theirs], index) => (
              <div
                key={label}
                className={`compare-row ${index % 2 ? "bg-[#FBFAF7]" : "bg-white"} border-b border-navy/6 last:border-0`}
              >
                <div className="font-bold text-navy">{label}</div>
                <div className="flex items-center justify-center gap-1.5 text-center font-bold text-[#15803D]">
                  <Check className="hidden h-4 w-4 shrink-0 sm:block" strokeWidth={3} />
                  {ours}
                </div>
                <div className="flex items-center justify-center gap-1.5 text-center font-medium text-[#8A8FA0]">
                  <X className="hidden h-4 w-4 shrink-0 sm:block" strokeWidth={3} />
                  {theirs}
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ================================================================ المعرض */}
      <section id="gallery" className="section-pad bg-ivory">
        <div className="shell">
          <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="kicker">صور حقيقية</span>
              <h2 className="h-section mt-4">شوفه من كل زاوية.</h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-[#4C5573]">
              اضغط على أي صورة لتكبيرها ومعاينة الخامة والحواف عن قرب.
            </p>
          </Reveal>

          <div className="mt-9 grid gap-4 lg:grid-cols-[1.5fr_.5fr]">
            {/* object-contain لأن صور المنتج بنسب مختلفة — يمنع قصّ اللوح */}
            <Reveal delay={0.06} className="hero-frame group relative aspect-[4/3] w-full">
              <button onClick={() => setLightbox(true)} className="absolute inset-0 h-full w-full" aria-label="تكبير الصورة">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={productImages[activePhoto].src}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.34 }}
                    src={productImages[activePhoto].src}
                    alt={productImages[activePhoto].alt}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                </AnimatePresence>
                <span className="absolute inset-0 bg-gradient-to-t from-navy-deep/45 via-transparent to-transparent" />
                <span className="absolute bottom-4 right-4 rounded-full bg-white/92 px-4 py-2 text-xs font-black text-navy backdrop-blur">
                  {productImages[activePhoto].label}
                </span>
                <span className="absolute bottom-4 left-4 grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-white/12 text-white backdrop-blur-md transition-transform group-hover:scale-110">
                  <Maximize2 className="h-4 w-4" />
                </span>
              </button>
            </Reveal>

            <div className="grid grid-cols-4 gap-3 lg:grid-cols-1 lg:gap-4">
              {productImages.map((image, index) => (
                <Reveal key={image.label} delay={0.1 + index * 0.06}>
                  <button
                    onClick={() => setActivePhoto(index)}
                    data-active={activePhoto === index}
                    className="thumb w-full lg:aspect-[4/3]"
                    aria-label={`عرض: ${image.label}`}
                    aria-pressed={activePhoto === index}
                  >
                    <img src={image.src} alt={image.alt} loading="lazy" />
                  </button>
                </Reveal>
              ))}
            </div>
          </div>

          {/* المواصفات */}
          <Reveal delay={0.1} className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-navy/10 bg-navy/10 sm:grid-cols-2 lg:grid-cols-3">
            {specs.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between bg-white px-5 py-4">
                <span className="text-sm font-bold text-[#7A8299]">{label}</span>
                <span className="font-display text-sm font-extrabold text-navy">{value}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* =============================================================== الآراء */}
      <section className="section-pad bg-sand">
        <div className="shell">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="kicker justify-center">آراء العملاء</span>
            <h2 className="h-section mt-4">ناس جرّبته قبلك.</h2>
          </Reveal>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {reviews.map((review, index) => (
              <Reveal key={review.name} delay={index * 0.09} className="card relative p-6">
                <Quote className="absolute left-5 top-5 h-8 w-8 text-navy/8" />
                <div className="flex gap-1">
                  {Array.from({ length: review.rating }).map((_, star) => (
                    <Star key={star} className="h-4 w-4 fill-[#F5A524] text-[#F5A524]" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-7 text-[#4C5573]">{review.text}</p>
                <div className="mt-5 flex items-center gap-3 border-t border-navy/8 pt-4">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-navy font-display text-sm font-black text-white">
                    {review.name.charAt(0)}
                  </span>
                  <div>
                    <b className="block font-display text-sm font-extrabold text-navy">{review.name}</b>
                    <small className="text-xs text-[#7A8299]">{review.city}</small>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ نموذج الطلب */}
      <section id="order" className="section-pad scroll-mt-20 bg-ivory">
        <div className="shell grid items-start gap-9 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
          <Reveal direction="right" className="lg:sticky lg:top-24">
            <span className="kicker">خطوة واحدة</span>
            <h2 className="h-section mt-4">اطلبه دلوقتي.</h2>
            <p className="mt-4 max-w-md text-sm leading-8 text-[#4C5573] sm:text-base">
              اكتب اسمك ورقمك وعنوانك، واختر محافظتك عشان يظهرلك سعر الشحن. الطلب بيروح
              لفريق التجهيز على طول، وهنكلمك للتأكيد قبل الشحن.
            </p>

            <div className="mt-7 space-y-3">
              {[
                { icon: Truck, title: "الدفع عند الاستلام", text: "مش هتدفع جنيه واحد قبل ما تستلم." },
                { icon: ShieldCheck, title: "استبدال خلال ٧ أيام", text: "لو فيه أي عيب بنستبدله فورًا." },
                { icon: Sparkles, title: "أسعار شحن واضحة", text: "سعر الشحن بيظهر حسب محافظتك قبل التأكيد." },
              ].map((item, index) => (
                <Reveal key={item.title} delay={0.1 + index * 0.08} className="flex gap-3.5 rounded-2xl border border-navy/10 bg-white p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F3F4FF] text-navy">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <b className="block font-display text-sm font-extrabold text-navy">{item.title}</b>
                    <small className="mt-0.5 block text-xs leading-6 text-[#7A8299]">{item.text}</small>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* بطاقة السعر */}
            <Reveal delay={0.25} className="card-navy mt-7 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white/60">{PRODUCT_NAME}</p>
                  <div className="mt-2 flex items-end gap-2">
                    <b className="font-display text-4xl font-black leading-none">{pricing.sell}</b>
                    <span className="mb-1 text-sm font-bold">جنيه</span>
                  </div>
                  <s className="mt-1 block text-xs font-bold text-white/45">{egp(pricing.compareAt)}</s>
                </div>
                <div className="stamp h-[74px] w-[74px]">
                  <small>وفّر</small>
                  <b className="text-2xl">{pricing.save}</b>
                </div>
              </div>
            </Reveal>
          </Reveal>

          <Reveal direction="left" delay={0.08}>
            <OrderForm pricing={pricing} />
          </Reveal>
        </div>
      </section>

      {/* ============================================================== الأسئلة */}
      <section id="faq" className="section-pad bg-sand">
        <div className="shell grid gap-9 lg:grid-cols-[.85fr_1.15fr] lg:gap-14">
          <Reveal direction="right">
            <span className="kicker">قبل ما تطلب</span>
            <h2 className="h-section mt-4">أسئلة بتتكرر كتير.</h2>
            <p className="mt-4 text-sm leading-7 text-[#4C5573]">
              لو لسه عندك سؤال تاني، اكتبه في خانة الملاحظات في نموذج الطلب وهنجاوبك
              وقت مكالمة التأكيد.
            </p>
          </Reveal>

          <Reveal delay={0.08} className="divide-y divide-navy/10 border-y border-navy/10">
            {faqItems.map((item, index) => {
              const open = openFaq === index;
              return (
                <div key={item.question}>
                  <button
                    onClick={() => setOpenFaq(open ? null : index)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-5 py-5 text-right font-display text-base font-extrabold text-navy transition-colors hover:text-brand-red sm:text-lg"
                  >
                    {item.question}
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 transition-transform duration-300 ${open ? "rotate-180 text-brand-red" : ""}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="pb-5 text-sm leading-8 text-[#4C5573]">{item.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </Reveal>
        </div>
      </section>

      {/* ========================================================== دعوة أخيرة */}
      <section className="relative overflow-hidden bg-navy-deep py-14 text-white sm:py-20">
        <div aria-hidden className="absolute inset-0 grid-lines-light" />
        <Reveal className="shell relative text-center">
          <h2 className="mx-auto max-w-2xl font-display text-[clamp(1.8rem,5.5vw,3rem)] font-black leading-[1.3] tracking-[-.025em]">
            جاهز تبدّل لوح التقطيع بتاعك؟
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-8 text-white/65 sm:text-base">
            {egp(pricing.sell)} بدلًا من {egp(pricing.compareAt)} — الدفع عند الاستلام، وشحن لكل محافظات مصر.
          </p>
          <button onClick={scrollToOrder} className="btn btn-primary btn-lg mt-8">
            <ShoppingBag className="h-5 w-5" />
            اطلب لوحك الآن
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Reveal>
      </section>

      <Footer />
      <MobileOrderBar pricing={pricing} onOrder={scrollToOrder} />
      <div className="h-20 lg:hidden" aria-hidden />

      {/* =========================================================== المعاينة */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(false)}
            role="dialog"
            aria-modal="true"
            aria-label="معاينة مكبّرة لصورة المنتج"
            className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/92 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
              className="relative max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-navy"
            >
              <img
                src={productImages[activePhoto].src}
                alt={productImages[activePhoto].alt}
                className="max-h-[82vh] w-full object-contain"
              />
              <button
                onClick={() => setLightbox(false)}
                className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white text-navy shadow-lg active:scale-95"
                aria-label="إغلاق المعاينة"
                autoFocus
              >
                <X className="h-5 w-5" />
              </button>

              <div className="absolute bottom-3 right-3 flex gap-2">
                {productImages.map((image, index) => (
                  <button
                    key={image.label}
                    onClick={() => setActivePhoto(index)}
                    className={`h-2 rounded-full transition-all ${
                      activePhoto === index ? "w-7 bg-brand-red" : "w-2 bg-white/45 hover:bg-white/70"
                    }`}
                    aria-label={`الصورة ${index + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
