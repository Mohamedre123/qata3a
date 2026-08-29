/**
 * العناصر المشتركة بين الصفحات: شريط العرض، الترويسة اللاصقة، والتذييل.
 */
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Flame, ShoppingBag, Sparkles, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { BRAND } from "@/lib/content";
import { egp, type Pricing } from "@/lib/api";

const announcements = [
  { icon: Flame, text: "عرض لفترة محدودة — وفّر على لوح التقطيع الستانلس" },
  { icon: Truck, text: "شحن لكل محافظات مصر • الدفع عند الاستلام" },
  { icon: Sparkles, text: "ستانلس أصلي لا يمتص الروائح ولا يتخدش" },
];

export function TopBar({ pricing }: { pricing: Pricing }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((value) => (value + 1) % announcements.length), 4200);
    return () => clearInterval(timer);
  }, []);

  const Item = announcements[index].icon;

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 9 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -9 }}
            transition={{ duration: 0.32 }}
            className="flex items-center gap-2"
          >
            <Item className="h-3.5 w-3.5 shrink-0" />
            {announcements[index].text}
          </motion.span>
        </AnimatePresence>
        <span className="topbar-sep hidden sm:block" />
        <b className="hidden sm:block">
          {egp(pricing.sell)} بدلًا من {pricing.compareAt}
        </b>
      </div>
    </div>
  );
}

export function Header({ onOrder }: { onOrder: () => void }) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="site-header" data-stuck={stuck}>
      <div className="shell flex items-center justify-between gap-4 py-3">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${BRAND.name} — الصفحة الرئيسية`}>
          <span className="brand-mark ring-1 ring-navy/8">
            <img src={BRAND.logo} alt={`شعار ${BRAND.name}`} width={46} height={46} />
          </span>
          <span className="leading-none">
            <b className="block font-display text-lg font-black tracking-tight text-navy">{BRAND.name}</b>
            <small className="mt-1 block text-[10px] font-extrabold tracking-[.11em] text-brand-red">
              {BRAND.tagline}
            </small>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <a href="#features" className="nav-link">المميزات</a>
          <a href="#gallery" className="nav-link">الصور</a>
          <a href="#compare" className="nav-link">المقارنة</a>
          <a href="#faq" className="nav-link">الأسئلة</a>
        </nav>

        <button onClick={onOrder} className="btn btn-navy !px-4 !py-3 text-sm sm:!px-5">
          <ShoppingBag className="h-4 w-4" />
          <span>اطلب الآن</span>
          <ArrowLeft className="hidden h-4 w-4 sm:block" />
        </button>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-navy-deep text-white">
      <div className="shell grid gap-8 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="brand-mark">
              <img src={BRAND.logo} alt={`شعار ${BRAND.name}`} width={46} height={46} />
            </span>
            <div>
              <b className="block font-display text-xl font-black">{BRAND.name}</b>
              <small className="text-xs text-white/55">{BRAND.tagline}</small>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-7 text-white/60">
            بنختار أدوات المطبخ اللي تستحمل الاستخدام اليومي وتفضل نضيفة، ونوصّلها لباب بيتك
            بالدفع عند الاستلام.
          </p>
        </div>

        <div>
          <h3 className="font-display text-sm font-extrabold tracking-wide text-white/90">روابط</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/60">
            <li><a href="#features" className="transition-colors hover:text-white">مميزات المنتج</a></li>
            <li><a href="#gallery" className="transition-colors hover:text-white">صور المنتج</a></li>
            <li><a href="#order" className="transition-colors hover:text-white">اطلب الآن</a></li>
            <li><a href="#faq" className="transition-colors hover:text-white">الأسئلة الشائعة</a></li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-extrabold tracking-wide text-white/90">الطلب والشحن</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/60">
            <li>الدفع عند الاستلام في كل المحافظات</li>
            <li>التوصيل من ٢ إلى ٥ أيام عمل</li>
            <li>استبدال خلال ٧ أيام من الاستلام</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="shell flex flex-col items-center justify-between gap-3 py-5 text-center text-xs text-white/45 sm:flex-row sm:text-right">
          <p>© {new Date().getFullYear()} {BRAND.name}. جميع الحقوق محفوظة.</p>
          <p>الأسعار بالجنيه المصري وشاملة الضريبة.</p>
        </div>
      </div>
    </footer>
  );
}

export function MobileOrderBar({ pricing, onOrder }: { pricing: Pricing; onOrder: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 90 }}
          animate={{ y: 0 }}
          exit={{ y: 90 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mobile-bar"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <b className="font-display text-xl font-black text-navy">{pricing.sell}</b>
              <span className="text-xs font-bold text-navy">جنيه</span>
              <s className="text-xs font-bold text-steel">{pricing.compareAt}</s>
            </div>
            <small className="text-[11px] font-bold text-[#16A34A]">الدفع عند الاستلام</small>
          </div>
          <button onClick={onOrder} className="btn btn-primary !px-6 !py-3.5">
            <ShoppingBag className="h-4 w-4" />
            اطلب الآن
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
