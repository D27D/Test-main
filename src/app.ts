import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { TaskStore, ValidationError } from "./tasks.js";

export const VERSION = process.env.APP_VERSION ?? "dev";
const PUBLIC_DIR = path.join(import.meta.dirname, "..", "public");

export function createApp(store: TaskStore = new TaskStore()) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", false);

  // Cabeceras de seguridad (las que revisa el escaneo OWASP ZAP del pipeline)
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          manifestSrc: ["'self'"],
          workerSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-origin" },
      referrerPolicy: { policy: "no-referrer" },
      frameguard: { action: "deny" },
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    next();
  });
  app.use(express.json({ limit: "10kb" }));

  // ------------------------------------------------------------------ API
  const api = express.Router();
  api.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  api.get("/tasks", (_req, res) => {
    res.json({ data: store.list(), stats: store.stats() });
  });

  api.post("/tasks", (req, res) => {
    const task = store.create(req.body ?? {});
    res.status(201).location(`/api/tasks/${task.id}`).json({ data: task });
  });

  api.get("/tasks/:id", (req, res) => {
    const task = store.get(req.params.id);
    if (!task) return void res.status(404).json({ error: "Tarea no encontrada" });
    res.json({ data: task });
  });

  api.patch("/tasks/:id", (req, res) => {
    const task = store.update(req.params.id, req.body ?? {});
    if (!task) return void res.status(404).json({ error: "Tarea no encontrada" });
    res.json({ data: task });
  });

  api.delete("/tasks/:id", (req, res) => {
    if (!store.delete(req.params.id)) return void res.status(404).json({ error: "Tarea no encontrada" });
    res.status(204).end();
  });

  app.get("/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ status: "ok", version: VERSION, uptime: Math.round(process.uptime()) });
  });
  app.use("/api", api);

  // ----------------------------------------------------- interfaz estática
  app.use(express.static(PUBLIC_DIR, { index: "index.html", maxAge: "1h" }));

  // ------------------------------------------------------- 404 y errores
  app.use((_req, res) => {
    res.status(404).json({ error: "Recurso no encontrado" });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) return void res.status(400).json({ error: err.message });
    if (err instanceof SyntaxError || (err as { type?: string })?.type === "entity.parse.failed") {
      return void res.status(400).json({ error: "JSON inválido" });
    }
    if ((err as { type?: string })?.type === "entity.too.large") {
      return void res.status(413).json({ error: "Cuerpo de la solicitud demasiado grande" });
    }
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  });

  return app;
}
