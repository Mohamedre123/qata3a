# قطاعتي — الخطوات المتبقية عليك

## DNS
- [ ] عند مسجّل الدومين: سجل A لـ `@` → `76.76.21.21`
- [ ] سجل CNAME لـ `www` → `cname.vercel-dns.com`
- [ ] في Vercel → Settings → Domains: ضيف `qata3ty.site` و `www.qata3ty.site`

## متغيّرات Vercel (All Environments)
- [ ] `ADMIN_TOKEN` = نص طويل عشوائي
- [ ] `SAFKA_PRODUCT_ID` = 6a7c9cab42d4b8fe405be078
- [ ] `SELL_PRICE` = 590
- [ ] `COMPARE_AT_PRICE` = 700
- [ ] `SAFKA_PAGE_NAME` = قطاعتي
- [ ] `PUBLIC_URL` = https://qata3ty.site
- [ ] Redeploy بعد إضافتهم

## الربط بصفقة
- [ ] افتح https://qata3ty.site/admin واضغط «اربط الموقع بحساب صفقة» ثم «سماح»
- [ ] خد المفتاح من Vercel → Logs وحطه في `SAFKA_API_KEY` ثم Redeploy
- [ ] تأكد إن `/admin` بيقول «الموقع مربوط بمنصة صفقة ✅»

## اختبار
- [ ] https://qata3ty.site/api/health يرجّع connected: true
- [ ] اعمل طلب تجريبي وتأكد إنه ظهر في لوحة صفقة
- [ ] راجع نصوص الآراء في `client/src/lib/content.ts` — دي نصوص مبدئية
