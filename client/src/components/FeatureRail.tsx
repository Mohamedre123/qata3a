/**
 * كاروسيل المميزات.
 *
 * على الموبايل: بطاقات جنب بعض تتسحب بالإصبع (scroll-snap) مع أسهم ونقاط.
 * من مقاس lb وطالع: بيتحوّل لشبكة أربعة أعمدة عادية — كله في CSS (.rail).
 */
import { ChevronLeft, ChevronRight, Hand, ShieldCheck, Sparkles, Wind } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import { features } from "@/lib/content";

const icons = { sparkles: Sparkles, wind: Wind, hand: Hand, shield: ShieldCheck } as const;

export default function FeatureRail() {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  /** عرض البطاقة + المسافة بينها وبين اللي بعدها. */
  const stepSize = (rail: HTMLDivElement) => {
    const card = rail.firstElementChild as HTMLElement | null;
    const gap = Number.parseFloat(getComputedStyle(rail).columnGap) || 0;
    return (card?.clientWidth ?? 240) + gap;
  };

  /**
   * في الاتجاه RTL المتصفحات الحديثة بتخلي scrollLeft بالسالب، فبنشتغل
   * بالقيمة المطلقة عشان الحساب يبقى صح في الاتجاهين.
   */
  const sync = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const offset = Math.abs(rail.scrollLeft);
    const max = rail.scrollWidth - rail.clientWidth;
    const ended = offset >= max - 8;

    // آخر بطاقة مش بتوصل لأول الشريط، فبنثبّت المؤشّر على آخر عنصر عند النهاية.
    setActive(ended ? features.length - 1 : Math.round(offset / stepSize(rail)));
    setAtStart(offset < 8);
    setAtEnd(ended);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    sync();
    rail.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      rail.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  /**
   * التنقّل بالفهرس مش بالإزاحة النسبية — كده الضغط المتكرّر أثناء الحركة
   * الناعمة ما بيتراكمش وكل ضغطة بتوصل لبطاقة واحدة بالظبط.
   */
  const goTo = useCallback((index: number) => {
    const rail = railRef.current;
    if (!rail) return;

    const clamped = Math.max(0, Math.min(features.length - 1, index));
    const rtl = getComputedStyle(rail).direction === "rtl";
    const max = rail.scrollWidth - rail.clientWidth;
    const target = Math.min(stepSize(rail) * clamped, max);

    rail.scrollTo({ left: target * (rtl ? -1 : 1), behavior: "smooth" });
    setActive(clamped);
  }, []);

  return (
    <>
      {/* أسهم التحكّم — تظهر على الموبايل والتابلت فقط */}
      <div className="mt-8 flex items-center justify-between gap-4 lg:hidden">
        <p className="text-xs font-bold text-white/50">اسحب لليمين والشمال لتصفّح المميزات</p>
        <div className="flex gap-2">
          <button onClick={() => goTo(active - 1)} disabled={atStart} className="rail-nav" aria-label="السابق">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => goTo(active + 1)} disabled={atEnd} className="rail-nav" aria-label="التالي">
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={railRef} className="rail mt-4 lg:mt-11" role="list">
        {features.map((feature, index) => {
          const Icon = icons[feature.icon as keyof typeof icons];
          return (
            <Reveal
              key={feature.number}
              delay={index * 0.07}
              amount={0.2}
              role="listitem"
              className="group relative bg-navy p-6 ring-1 ring-white/12 transition-colors duration-300 hover:bg-[#161B7F] sm:p-7 lg:ring-0"
            >
              <div className="flex items-start justify-between">
                <span className="font-display text-xs font-black tracking-[.16em] text-[#FF8E91]">
                  {feature.number}
                </span>
                <Icon className="h-6 w-6 text-white/85 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="mt-8 font-display text-lg font-extrabold leading-[1.45] sm:text-xl lg:mt-10">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-white/65">{feature.text}</p>
            </Reveal>
          );
        })}
      </div>

      {/* نقاط الترقيم — موبايل وتابلت فقط */}
      <div className="mt-5 flex justify-center gap-2 lg:hidden">
        {features.map((feature, index) => (
          <button
            key={feature.number}
            onClick={() => goTo(index)}
            data-active={active === index}
            className="rail-dot"
            aria-label={`الميزة ${index + 1}`}
          />
        ))}
      </div>
    </>
  );
}
