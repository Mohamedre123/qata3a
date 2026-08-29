/**
 * نقطة دخول Vercel Serverless Function.
 *
 * Vercel بيحوّل كل طلب على /api/* للملف ده (catch-all route)، وإحنا بنمرّره
 * لنفس راوتر Express المستخدم محليًا — يعني كود واحد للتطوير وللإنتاج.
 *
 * ملفات الواجهة نفسها بتتقدّم كملفات ثابتة من dist/public، فالملف ده
 * مسؤول عن الـ API بس.
 */
import express from "express";
import { createApiRouter } from "../server/api.js";

const app = express();
app.set("trust proxy", true);
app.use("/api", createApiRouter());

export default app;
