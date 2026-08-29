/**
 * مميزات المنتج — شريط قابل للسحب على الموبايل، وشبكة أربعة أعمدة من lg.
 */
import { Hand, ShieldCheck, Sparkles, Wind } from "lucide-react";
import Rail from "@/components/Rail";
import Reveal from "@/components/Reveal";
import { features } from "@/lib/content";

const icons = { sparkles: Sparkles, wind: Wind, hand: Hand, shield: ShieldCheck } as const;

export default function FeatureRail() {
  return (
    <Rail
      count={features.length}
      hint="اسحب لتصفّح المميزات"
      className="rail-divided lg:mt-11 lg:grid-cols-4"
    >
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
            <h3 className="mt-8 font-display text-lg font-extrabold leading-[1.6] sm:text-xl lg:mt-10">
              {feature.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-white/65">{feature.text}</p>
          </Reveal>
        );
      })}
    </Rail>
  );
}
