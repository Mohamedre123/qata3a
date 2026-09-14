/**
 * غلاف حركة الظهور عند التمرير — انزلاق وتلاشٍ قصير أقل من 600ms،
 * ويتوقّف تلقائيًا لو المستخدم مفعّل «تقليل الحركة» في نظامه.
 */
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type Direction = "up" | "down" | "right" | "left" | "none";

const offsets: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 26 },
  down: { y: -26 },
  right: { x: 30 },
  left: { x: -30 },
  none: {},
};

export default function Reveal({
  children,
  delay = 0,
  direction = "up",
  amount = 0.25,
  duration = 0.55,
  ...rest
}: {
  children: ReactNode;
  delay?: number;
  direction?: Direction;
  amount?: number;
  duration?: number;
} & Omit<HTMLMotionProps<"div">, "children">) {
  const reduce = useReducedMotion();

  if (reduce) return <div {...(rest as object)}>{children}</div>;

  // على الموبايل العنصر بياخد عرض الشاشة كله، فالانزلاق الجانبي بيبدأه
  // بره الكادر ويوسّع الصفحة (فراغ جانبي + كروم بيصغّر الصفحة فالشريط
  // السفلي بيغطس). فبنحوّله لانزلاق من تحت.
  const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
  const offset = narrow && (direction === "right" || direction === "left") ? offsets.up : offsets[direction];

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
