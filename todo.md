# قطاعتي — الخطوات المتبقية عليك

## 1) متغيّر سرّي لازم تضيفه في Vercel
Settings → Environment Variables → All Environments:

    META_ACCESS_TOKEN = <التوكن بتاع Meta Conversions API>

بعدها Redeploy. من غيره حدث الشراء هيتبعت من المتصفح بس (وهتخسر جزء منه).
🔴 التوكن ده سرّي — لو اتشارك في أي مكان غيّره من Events Manager.

## 2) تخزين دائم لتتبّع الطلب
- [ ] Vercel → Storage → Marketplace → Upstash (Redis) → Create → اربطه بالمشروع
- [ ] Redeploy
> من غيره صفحة /track بتشتغل بس الحالات بتضيع مع كل نشر.

## 3) اختبار البيكسل (اختياري ومؤقت)
- [ ] Events Manager → Test Events → خد الكود
- [ ] ضيف META_TEST_EVENT_CODE في Vercel → اعمل طلب تجريبي → اتأكد إن Purchase
      واصل من Browser و Server ومندمج
- [ ] **امسح المتغيّر ده بعد الاختبار**

## 4) لو حملة تيك توك متضبّطة على Complete Payment
- [ ] ضيف VITE_TIKTOK_PURCHASE_EVENT=CompletePayment في Vercel ثم Redeploy

## 5) سجل الطلبات في Google Sheet (مؤجّل)
الكود جاهز في docs/google-sheet-webhook.gs لما تحتاجه.

## 6) تأكيدات
- [ ] افتح /admin وشوف «عمولتك للقطعة» — لو صفر لازم تزوّد SELL_PRICE
- [ ] اعمل طلب تجريبي وتأكد إنه ظهر في لوحة صفقة
- [ ] راجع نصوص الآراء في client/src/lib/content.ts — دي نصوص مبدئية
