/**
 * سكربت Google Apps Script لاستقبال طلبات موقع «قطاعتي» في Google Sheet.
 *
 * الموقع بيبعت POST بكل طلب على الرابط اللي هيطلع من النشر، وده بيضيف
 * صف جديد في الشيت.
 *
 * خطوات التركيب:
 *   1. افتح https://sheets.new واعمل شيت جديد وسمّيه «طلبات قطاعتي».
 *   2. من القائمة: Extensions ← Apps Script.
 *   3. امسح أي كود موجود، والصق الكود ده كله، واحفظ (Ctrl+S).
 *   4. اضغط Deploy ← New deployment ← اختار النوع «Web app».
 *        Description: qataaty orders
 *        Execute as:  Me
 *        Who has access: Anyone      ← مهم جدًا، غير كده الموقع مش هيعرف يوصل
 *   5. اضغط Deploy ووافق على الصلاحيات (اختار حسابك ← Advanced ← Go to … ← Allow).
 *   6. انسخ الـ Web app URL (بيبدأ بـ https://script.google.com/macros/s/…/exec).
 *   7. في Vercel: Settings ← Environment Variables ← ضيف
 *        ORDERS_WEBHOOK_URL = <الرابط ده>
 *      وبعدين Redeploy.
 *
 * ملاحظة: أي تعديل في الكود بعد كده لازم يتبعه
 * Deploy ← Manage deployments ← Edit ← New version ← Deploy.
 */

var HEADERS = [
  "التاريخ",
  "رقم الطلب",
  "اسم العميل",
  "الموبايل",
  "موبايل احتياطي",
  "المحافظة",
  "المدينة",
  "العنوان",
  "الكمية",
  "سعر القطعة",
  "الشحن",
  "الإجمالي",
  "ملاحظات",
  "وصل لصفقة؟",
  "رقم صفقة",
  "الخطأ",
];

function doPost(e) {
  try {
    var order = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // أول مرة: نكتب صف العناوين ونثبّته
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
      sheet.setRightToLeft(true);
    }

    var customer = order.customer || {};
    var safka = order.safka || {};

    sheet.appendRow([
      formatCairoTime(order.created_at),
      order.ref || "",
      customer.name || "",
      "'" + (customer.phone1 || ""), // الفاصلة العليا تمنع الشيت من مسح الصفر الأول
      customer.phone2 ? "'" + customer.phone2 : "",
      customer.governorateName || "",
      customer.cityName || "",
      customer.address || "",
      order.qty || "",
      order.unitPrice || "",
      order.shipping || "",
      order.total || "",
      order.note || "",
      order.synced ? "نعم" : "لا",
      safka.serial_number || "",
      order.error || "",
    ]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** تحويل وقت UTC لتوقيت القاهرة بصيغة مقروءة. */
function formatCairoTime(iso) {
  if (!iso) return "";
  try {
    return Utilities.formatDate(new Date(iso), "Africa/Cairo", "yyyy-MM-dd HH:mm");
  } catch (err) {
    return iso;
  }
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/** للتأكد إن الرابط شغال لما تفتحه في المتصفح. */
function doGet() {
  return json({ ok: true, service: "qataaty orders webhook" });
}
