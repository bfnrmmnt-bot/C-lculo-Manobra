import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Health check API or custom APIs
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));
  const isProduction = process.env.NODE_ENV === "production" || hasDist;

  console.log(`Starting server. NODE_ENV: ${process.env.NODE_ENV}, hasDist: ${hasDist}, isProduction: ${isProduction}`);

  if (!isProduction) {
    console.log("Serving application in DEVELOPMENT mode using Vite middleware.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log(`Serving application in PRODUCTION mode from: ${distPath}`);
    app.use(express.static(distPath));
    // SPA fallback handling
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
