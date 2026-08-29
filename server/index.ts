/**
 * سيرفر الإنتاج: يقدّم ملفات الواجهة المبنيّة، ويشغّل نقاط الـ API
 * التي تربط الموقع بمنصة صفقة (المفتاح السرّي لا يغادر هذا السيرفر أبدًا).
 */
import express from "express";
import fs from "node:fs";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createApiRouter } from "./api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.set("trust proxy", true);
  const server = createServer(app);

  // نقاط الـ API قبل الملفات الثابتة.
  app.use("/api", createApiRouter());

  // ملفات الواجهة المبنيّة — نكتشف المسار تلقائيًا حتى يعمل على أي نظام
  // دون الحاجة لضبط NODE_ENV (صيغة `NODE_ENV=x` لا تعمل على PowerShell).
  const candidates = [
    path.resolve(__dirname, "public"),
    path.resolve(__dirname, "..", "dist", "public"),
  ];
  const staticPath = candidates.find((dir) => fs.existsSync(path.join(dir, "index.html"))) ?? candidates[0];

  app.use(express.static(staticPath, { maxAge: "7d", index: false }));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(
      process.env.SAFKA_API_KEY
        ? "[qataaty] Safka key loaded from .env"
        : "[qataaty] no SAFKA_API_KEY in .env — waiting for /api/safka/callback",
    );
  });
}

startServer().catch(console.error);
