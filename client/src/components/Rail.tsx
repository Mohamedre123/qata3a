/**
 * شريط قابل للسحب.
 *
 * على الموبايل والتابلت: بطاقات جنب بعض تتسحب بالإصبع (scroll-snap) مع أسهم
 * ونقاط ترقيم. من مقاس lg وطالع: بيتحوّل لشبكة عادية — التحوّل نفسه في CSS
 * (.rail)، والأسهم والنقاط بتختفي بـ lg:hidden.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export default function Rail({
  count,
  hint,
  className = "",
  tone = "light",
  children,
}: {
  /** عدد البطاقات — لازم يطابق عدد الأبناء. */
  count: number;
  /** نص إرشادي جنب الأسهم. */
  hint?: string;
  /** أدوات Tailwind إضافية للحاوية (أعمدة الشبكة على lg مثلًا). */
  className?: string;
  /** لون الأسهم والنقاط حسب خلفية القسم. */
  tone?: "light" | "dark";
  children: ReactNode;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  /** عرض البطاقة + المسافة اللي بعدها. */
  const stepSize = (rail: HTMLDivElement) => {
    const card = rail.firstElementChild as HTMLElement | null;
    const gap = Number.parseFloat(getComputedStyle(rail).columnGap) || 0;
    return (card?.clientWidth ?? 240) + gap;
  };

  /**
   * في الاتجاه RTL المتصفحات الحديثة بتخلّي scrollLeft بالسالب، فبنشتغل
   * بالقيمة المطلقة عشان الحساب يبقى صح في الاتجاهين.
   */
  const sync = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const offset = Math.abs(rail.scrollLeft);
    const max = rail.scrollWidth - rail.clientWidth;
    const ended = max > 0 && offset >= max - 8;

    // آخر بطاقة مش بتوصل لأول الشريط، فبنثبّت المؤشّر على آخر عنصر عند النهاية.
    setActive(ended ? count - 1 : Math.round(offset / stepSize(rail)));
    setAtStart(offset < 8);
    setAtEnd(ended);
  }, [count]);

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
  const goTo = useCallback(
    (index: number) => {
      const rail = railRef.current;
      if (!rail) return;

      const clamped = Math.max(0, Math.min(count - 1, index));
      const rtl = getComputedStyle(rail).direction === "rtl";
      const max = rail.scrollWidth - rail.clientWidth;
      const target = Math.min(stepSize(rail) * clamped, max);

      rail.scrollTo({ left: target * (rtl ? -1 : 1), behavior: "smooth" });
      setActive(clamped);
    },
    [count],
  );

  const dark = tone === "dark";

  return (
    <>
      <div className="mb-4 mt-8 flex items-center justify-between gap-4 lg:hidden">
        {hint && (
          <p className={`text-xs font-bold ${dark ? "text-navy/45" : "text-white/50"}`}>{hint}</p>
        )}
        <div className="mr-auto flex gap-2">
          <button
            onClick={() => goTo(active - 1)}
            disabled={atStart}
            className={`rail-nav ${dark ? "rail-nav-dark" : ""}`}
            aria-label="السابق"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => goTo(active + 1)}
            disabled={atEnd}
            className={`rail-nav ${dark ? "rail-nav-dark" : ""}`}
            aria-label="التالي"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={railRef} className={`rail ${className}`} role="list">
        {children}
      </div>

      <div className="mt-5 flex justify-center gap-2 lg:hidden">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            data-active={active === index}
            className={`rail-dot ${dark ? "rail-dot-dark" : ""}`}
            aria-label={`العنصر ${index + 1}`}
          />
        ))}
      </div>
    </>
  );
}
