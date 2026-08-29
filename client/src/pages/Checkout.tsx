/**
 * صفحة طلب مستقلة — نفس نموذج الصفحة الرئيسية، مفيدة للروابط المباشرة
 * (إعلانات، واتساب، رسائل) اللي عايزة توصل العميل لخطوة الطلب فورًا.
 */
import { ChevronRight, ShieldCheck, Truck, Undo2 } from "lucide-react";
import { Link } from "wouter";
import OrderForm from "@/components/OrderForm";
import Reveal from "@/components/Reveal";
import { Footer, TopBar } from "@/components/SiteChrome";
import { egp, useStorefront } from "@/lib/api";
import { BRAND, PRODUCT_NAME, productImages } from "@/lib/content";

export default function Checkout() {
  const { pricing } = useStorefront();

  return (
    <main dir="rtl" className="min-h-screen bg-ivory text-[#101733]">
      <TopBar pricing={pricing} />

      <header className="border-b border-navy/10 bg-white/70 backdrop-blur">
        <div className="shell flex items-center justify-between gap-4 py-3.5">
          <Link href="/" className="flex items-center gap-2.5" aria-label={`${BRAND.name} — الرئيسية`}>
            <span className="brand-mark ring-1 ring-navy/8">
              <img src={BRAND.logo} alt={`شعار ${BRAND.name}`} width={46} height={46} />
            </span>
            <b className="font-display text-lg font-black text-navy">{BRAND.name}</b>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-bold text-navy transition-colors hover:text-brand-red"
          >
            <Undo2 className="h-4 w-4" />
            العودة للمنتج
          </Link>
        </div>
      </header>

      <section className="shell py-8 sm:py-12">
        <nav aria-label="مسار التصفّح" className="flex items-center gap-1.5 text-xs font-bold text-[#7A8299]">
          <Link href="/" className="transition-colors hover:text-navy">الرئيسية</Link>
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          <span className="text-navy">إتمام الطلب</span>
        </nav>

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
          <Reveal direction="left">
            <OrderForm pricing={pricing} />
          </Reveal>

          <Reveal direction="right" delay={0.08} className="lg:sticky lg:top-8">
            <div className="card-navy overflow-hidden">
              <div className="relative h-52 sm:h-64">
                <img
                  src={productImages[3].src}
                  alt={PRODUCT_NAME}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/25 to-transparent" />
                <span className="badge-soft absolute bottom-4 right-5 bg-brand-red text-white">
                  وفّر {pricing.save} جنيه
                </span>
              </div>

              <div className="p-6">
                <p className="text-xs font-bold text-white/60">المنتج</p>
                <h2 className="mt-1 font-display text-xl font-extrabold leading-[1.5]">{PRODUCT_NAME}</h2>

                <div className="divider-dashed my-5 opacity-40" />

                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-white/70">
                    <dt>السعر قبل الخصم</dt>
                    <dd><s>{egp(pricing.compareAt)}</s></dd>
                  </div>
                  <div className="flex justify-between text-[#FFB0B2]">
                    <dt>خصم العرض</dt>
                    <dd>{egp(pricing.save)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-white/15 pt-3 font-display text-lg font-black">
                    <dt>سعر القطعة</dt>
                    <dd>{egp(pricing.sell)}</dd>
                  </div>
                </dl>

                <p className="mt-4 text-xs leading-6 text-white/50">
                  يُضاف سعر الشحن حسب المحافظة، ويظهر في نموذج الطلب قبل التأكيد.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                { icon: Truck, title: "الدفع عند الاستلام", text: "بدون أي دفع مقدم." },
                { icon: ShieldCheck, title: "استبدال خلال ٧ أيام", text: "لو وصلك المنتج به عيب." },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 rounded-2xl border border-navy/10 bg-white p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F3F4FF] text-navy">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <b className="block font-display text-sm font-extrabold text-navy">{item.title}</b>
                    <small className="text-xs text-[#7A8299]">{item.text}</small>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
