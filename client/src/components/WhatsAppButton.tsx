/**
 * زر واتساب عائم على يسار الشاشة.
 *
 * تفاصيل مهمة:
 *   • على الموبايل بيرتفع فوق شريط الطلب الثابت (.mobile-bar) لما يظهر، عشان
 *     ما يركبوش على بعض — بيستخدم نفس عتبة التمرير بتاعت الشريط.
 *   • على الشاشات الكبيرة بيتوسّع عند المرور ويظهر نص «تواصل معنا».
 *   • بيحترم إعداد «تقليل الحركة» فيقف النبض والدخول المتحرّك.
 */
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/content";

/** نفس العتبة اللي بيظهر عندها شريط الطلب في الموبايل. */
const MOBILE_BAR_THRESHOLD = 520;

export default function WhatsAppButton() {
  const reduce = useReducedMotion();
  const [raised, setRaised] = useState(false);

  useEffect(() => {
    const onScroll = () => setRaised(window.scrollY > MOBILE_BAR_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!BRAND.whatsapp) return null;

  const href = `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(BRAND.whatsappMessage)}`;

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`تواصل مع ${BRAND.name} على واتساب`}
      className="wa-fab"
      data-raised={raised}
      initial={reduce ? false : { opacity: 0, scale: 0.4, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : 1.1, type: "spring", stiffness: 240, damping: 18 }}
      whileTap={{ scale: 0.92 }}
    >
      {/* حلقتان تتوسّعان بالتناوب — إشارة حياة خفيفة بدون إزعاج */}
      <span aria-hidden className="wa-ring" />
      <span aria-hidden className="wa-ring wa-ring-delayed" />

      <svg viewBox="0 0 24 24" className="wa-icon" fill="currentColor" aria-hidden focusable="false">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.896 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>

      <span className="wa-label">تواصل معنا</span>
    </motion.a>
  );
}
