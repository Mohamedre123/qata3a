# قطاعتي — الخطوات المتبقية عليك

## مهم: تخزين دائم لتتبّع الطلب
- [ ] Vercel → Storage → Marketplace → Upstash (Redis) → Create
- [ ] اربطه بالمشروع (بيضيف KV_REST_API_URL و KV_REST_API_TOKEN لوحده)
- [ ] Redeploy
> من غيره التتبّع بيشتغل بس الحالات بتضيع مع كل نشر.

## سجل الطلبات في Google Sheet
- [ ] اعمل شيت من حساب iaomn8406@gmail.com
- [ ] Extensions → Apps Script → الصق docs/google-sheet-webhook.gs
- [ ] Deploy → Web app → Who has access: Anyone
- [ ] ضيف ORDERS_WEBHOOK_URL في Vercel ثم Redeploy

## تأكيدات
- [ ] افتح /admin وشوف «عمولتك للقطعة» — لو صفر لازم تزوّد SELL_PRICE
- [ ] اعمل طلب تجريبي وتأكد إنه ظهر في لوحة صفقة
- [ ] بعد ما تغيّر حالة الطلب من لوحة صفقة، افتح /track بالرقم وشوف الحالة اتحدّثت
- [ ] راجع نصوص الآراء في client/src/lib/content.ts — دي نصوص مبدئية
