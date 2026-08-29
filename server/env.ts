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

/**
 * `process.loadEnvFile` بيكتب فوق المتغيّرات الموجودة أصلًا، وده معناه إن سطر
 * فاضي في .env يقدر يلغي قيمة متظبطة من البيئة. بنعكس ده: اللي جاي من البيئة
 * له الأولوية، و.env بيملأ الناقص بس.
 */
const fromEnvironment = { ...process.env };

for (const envPath of candidates) {
  try {
    process.loadEnvFile(envPath);
    for (const [key, value] of Object.entries(fromEnvironment)) {
      if (value !== undefined) process.env[key] = value;
    }
    break;
  } catch {
    /* الملف غير موجود أو غير مقروء — نجرّب المسار التالي */
  }
}
