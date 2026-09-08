/**
 * تشغيل شغل في الخلفية بأمان بعد ما الرد يتبعت للعميل.
 *
 * المشكلة: على Vercel (وأي بيئة serverless) الدالة ممكن تتجمّد أو تتقفل بمجرد
 * ما الرد يخرج، فأي `void somePromise()` بعد الرد ممكن يتقطع في نصه. ده كان
 * هيضيّع أحداث الشراء المتأخّرة (TikTok مثلًا بياخد ~8 ثواني من مصر).
 *
 * الحل الرسمي هو `waitUntil` من @vercel/functions — بتقول للمنصة تسيب الدالة
 * عايشة لحد ما الوعد يخلص، من غير ما تأخّر رد العميل.
 *
 * محليًا (أو لو الاستيراد فشل) بنرجع لـ fire-and-forget عادي، وده كافي لأن
 * عملية Node العادية بتفضل شغّالة.
 */
import { waitUntil } from "@vercel/functions";

/**
 * يشغّل الوعد في الخلفية. مش بيرمي أبدًا — أي فشل بيتسجّل وبس، عشان ما يأثرش
 * على مسار الطلب.
 */
export function runInBackground(task: Promise<unknown>, label: string): void {
  const safe = task.catch((error: unknown) => {
    console.error(`[qataaty] background task "${label}" failed:`, (error as Error)?.message ?? error);
  });

  try {
    waitUntil(safe);
  } catch {
    // مش شغالين على Vercel — الوعد هيكمل لوحده في عملية Node العادية.
    void safe;
  }
}
