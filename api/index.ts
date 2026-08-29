/**
 * نقطة دخول Vercel Serverless Function.
 *
 * كل طلب على /api/* بيتحوّل هنا عن طريق rewrite في vercel.json، وبنمرّره
 * لنفس راوتر Express المستخدم محليًا — يعني كود واحد للتطوير وللإنتاج.
 *
 * ملفات الواجهة بتتقدّم كملفات ثابتة من dist/public، فالملف ده مسؤول عن
 * الـ API بس.
 */
import express, { type NextFunction, type Request, type Response } from "express";
import { createApiRouter } from "../server/api.js";

const app = express();
app.set("trust proxy", true);

/**
 * حسب طريقة التوجيه، ممكن يوصل المسار كامل (/api/orders) أو بعد ما البادئة
 * تتشال (/orders). بنوحّده هنا عشان الراوتر يلاقي مساره في الحالتين.
 */
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.url !== "/api" && !req.url.startsWith("/api/") && !req.url.startsWith("/api?")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  next();
});

app.use("/api", createApiRouter());

export default app;
