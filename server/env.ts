/**
 * تحميل ملف .env.
 *
 * لازم يتنفّذ قبل أي ملف بيقرأ من process.env عند الاستيراد (زي config.ts)،
 * عشان كده هو موديول مستقل يُستورد في أول سطر هناك — ES modules بتنفّذ
 * الاستيرادات بالترتيب قبل جسم الملف.
 *
 * في وضع التطوير، Vite هو اللي بيحمّل .env (راجع vite.config.ts) فبتفشل
 * المحاولات هنا بهدوء ومفيش مشكلة.
 */
import path from "node:path";

/** مجلد هذا الملف — غير متاح لو تم تحويل الحزمة إلى CommonJS. */
const MODULE_DIR: string | undefined = import.meta?.dirname;

const candidates = [
  process.env.ENV_FILE,
  MODULE_DIR ? path.resolve(MODULE_DIR, "..", ".env") : null,
  path.resolve(process.cwd(), ".env"),
].filter(Boolean) as string[];

for (const envPath of candidates) {
  try {
    process.loadEnvFile(envPath);
    break;
  } catch {
    /* الملف غير موجود أو غير مقروء — نجرّب المسار التالي */
  }
}
