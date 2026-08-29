import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "wouter";
import { BRAND } from "@/lib/content";

export default function NotFound() {
  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-ivory p-6 text-center">
      <div>
        <span className="brand-mark mx-auto !h-16 !w-16 !rounded-2xl">
          <img src={BRAND.logo} alt={`شعار ${BRAND.name}`} width={64} height={64} />
        </span>

        <p className="mt-7 font-display text-[clamp(4rem,16vw,7rem)] font-black leading-none tracking-tight text-navy/12">
          404
        </p>
        <h1 className="-mt-4 font-display text-2xl font-black text-navy sm:text-3xl">
          الصفحة دي مش موجودة.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[#5C6480]">
          يمكن الرابط اتغيّر أو اتكتب غلط. ارجع للصفحة الرئيسية وكمّل طلبك من هناك.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-navy">
            <Compass className="h-4 w-4" />
            الصفحة الرئيسية
          </Link>
          <Link href="/checkout" className="btn btn-ghost">
            اطلب المنتج
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
