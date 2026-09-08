# قطاعتي — الخطوات المتبقية عليك

## 1) متغيّرات سرّية في Vercel  ← الأهم
Settings → Environment Variables → النوع **Secret** → All Environments:

    META_ACCESS_TOKEN    = <توكن Meta Conversions API>
    TIKTOK_ACCESS_TOKEN  = <توكن TikTok Events API>

بعدها **Redeploy**.

⚠️ متضيفش VITE_TIKTOK_PURCHASE_EVENT — الافتراضي في الكود بقى CompletePayment.
   ولو احتجت تضيف أي متغيّر بادئته VITE_ اختار **Config** مش **Secret**
   (دي كانت المشكلة في الاسكرين — VITE_ بيتحط في كود المتصفح فمش سر).

🔴 التوكنات دي كتبتها في الشات — الأأمن تغيّرها من Events Manager وتحط الجديد.

## 2) ترتيب أحداث iOS (ميتا)
- [ ] Events Manager → Aggregated Event Measurement
- [ ] خلي Purchase أول حدث في الأولوية

## 3) تخزين دائم لتتبّع الطلب
- [ ] Vercel → Storage → Marketplace → Upstash (Redis) → Create → اربطه بالمشروع
- [ ] Redeploy
> من غيره صفحة /track بتشتغل بس الحالات بتضيع مع كل نشر.

## 4) اختبار الأحداث (مؤقت)
- [ ] خد كود الاختبار من كل منصة وحطه في META_TEST_EVENT_CODE و TIKTOK_TEST_EVENT_CODE
- [ ] اعمل طلب تجريبي
- [ ] في Vercel → Logs لازم تشوف:
        [qataaty] Meta CAPI purchase sent (...), received=1
        [qataaty] TikTok CompletePayment sent (...)
- [ ] **امسح متغيّرات الاختبار بعد كده**

## 5) سجل الطلبات في Google Sheet (مؤجّل)
الكود جاهز في docs/google-sheet-webhook.gs لما تحتاجه.

## 6) تأكيدات
- [ ] افتح /admin وشوف «عمولتك للقطعة» — لو صفر لازم تزوّد SELL_PRICE
- [ ] اعمل طلب تجريبي وتأكد إنه ظهر في لوحة صفقة
- [ ] راجع نصوص الآراء في client/src/lib/content.ts — دي نصوص مبدئية
