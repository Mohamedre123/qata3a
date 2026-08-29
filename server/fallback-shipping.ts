/**
 * قائمة محافظات احتياطية تُستخدم فقط قبل ربط الموقع بحساب صفقة،
 * حتى تظل صفحة الطلب قابلة للتصفّح أثناء الإعداد.
 *
 * بعد الربط تأتي المحافظات والمدن وأسعار الشحن الحقيقية من
 * GET /api/v1/public/price-list وتحلّ محل هذه القائمة بالكامل.
 */
export type FallbackGovernorate = { id: string; nameAr: string; nameEn: string; price: number };

export const FALLBACK_GOVERNORATES: FallbackGovernorate[] = [
  { id: "fallback-1", nameAr: "القاهرة", nameEn: "Cairo", price: 60 },
  { id: "fallback-2", nameAr: "الجيزة", nameEn: "Giza", price: 60 },
  { id: "fallback-3", nameAr: "القليوبية", nameEn: "Qalyubia", price: 65 },
  { id: "fallback-4", nameAr: "الإسكندرية", nameEn: "Alexandria", price: 65 },
  { id: "fallback-5", nameAr: "الدقهلية", nameEn: "Dakahlia", price: 70 },
  { id: "fallback-6", nameAr: "الشرقية", nameEn: "Sharqia", price: 70 },
  { id: "fallback-7", nameAr: "الغربية", nameEn: "Gharbia", price: 70 },
  { id: "fallback-8", nameAr: "المنوفية", nameEn: "Monufia", price: 70 },
  { id: "fallback-9", nameAr: "البحيرة", nameEn: "Beheira", price: 70 },
  { id: "fallback-10", nameAr: "كفر الشيخ", nameEn: "Kafr El Sheikh", price: 75 },
  { id: "fallback-11", nameAr: "دمياط", nameEn: "Damietta", price: 75 },
  { id: "fallback-12", nameAr: "بورسعيد", nameEn: "Port Said", price: 75 },
  { id: "fallback-13", nameAr: "الإسماعيلية", nameEn: "Ismailia", price: 75 },
  { id: "fallback-14", nameAr: "السويس", nameEn: "Suez", price: 75 },
  { id: "fallback-15", nameAr: "الفيوم", nameEn: "Faiyum", price: 75 },
  { id: "fallback-16", nameAr: "بني سويف", nameEn: "Beni Suef", price: 75 },
  { id: "fallback-17", nameAr: "المنيا", nameEn: "Minya", price: 80 },
  { id: "fallback-18", nameAr: "أسيوط", nameEn: "Asyut", price: 80 },
  { id: "fallback-19", nameAr: "سوهاج", nameEn: "Sohag", price: 85 },
  { id: "fallback-20", nameAr: "قنا", nameEn: "Qena", price: 85 },
  { id: "fallback-21", nameAr: "الأقصر", nameEn: "Luxor", price: 90 },
  { id: "fallback-22", nameAr: "أسوان", nameEn: "Aswan", price: 95 },
  { id: "fallback-23", nameAr: "البحر الأحمر", nameEn: "Red Sea", price: 110 },
  { id: "fallback-24", nameAr: "مطروح", nameEn: "Matrouh", price: 110 },
  { id: "fallback-25", nameAr: "شمال سيناء", nameEn: "North Sinai", price: 120 },
  { id: "fallback-26", nameAr: "جنوب سيناء", nameEn: "South Sinai", price: 120 },
  { id: "fallback-27", nameAr: "الوادي الجديد", nameEn: "New Valley", price: 120 },
];
