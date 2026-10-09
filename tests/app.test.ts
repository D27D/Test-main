import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("API HTTP", () => {
  it("GET /health responde ok sin caché", async () => {
    const res = await request(createApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("ciclo completo CRUD de /api/tasks", async () => {
    const app = createApp();
    const created = await request(app).post("/api/tasks").send({ title: "Preparar despacho" });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    expect(created.headers.location).toBe(`/api/tasks/${id}`);

    const list = await request(app).get("/api/tasks");
    expect(list.body.stats).toEqual({ total: 1, done: 0, pending: 1 });

    const patched = await request(app).patch(`/api/tasks/${id}`).send({ done: true });
    expect(patched.status).toBe(200);
    expect(patched.body.data.done).toBe(true);

    expect((await request(app).get(`/api/tasks/${id}`)).status).toBe(200);
    expect((await request(app).delete(`/api/tasks/${id}`)).status).toBe(204);
    expect((await request(app).get(`/api/tasks/${id}`)).status).toBe(404);
    expect((await request(app).patch(`/api/tasks/${id}`).send({ done: true })).status).toBe(404);
    expect((await request(app).delete(`/api/tasks/${id}`)).status).toBe(404);
  });

  it("valida la entrada y responde 400", async () => {
    const app = createApp();
    const res = await request(app).post("/api/tasks").send({ title: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/);

    const bad = await request(app).post("/api/tasks").set("Content-Type", "application/json").send("{malformado");
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe("JSON inválido");

    const big = await request(app).post("/api/tasks").send({ title: "x".repeat(20_000) });
    expect(big.status).toBe(413);
  });

  it("sirve la interfaz web y responde 404 en JSON para rutas desconocidas", async () => {
    const app = createApp();
    const home = await request(app).get("/");
    expect(home.status).toBe(200);
    expect(home.text).toContain("<title>Test-main");
    const missing = await request(app).get("/no-existe");
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe("Recurso no encontrado");
  });

  it("envía las cabeceras de seguridad que verifica OWASP ZAP", async () => {
    const res = await request(createApp()).get("/");
    const h = res.headers;
    expect(h["x-powered-by"]).toBeUndefined();
    expect(h["content-security-policy"]).toContain("default-src 'self'");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).not.toContain("unsafe-inline");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["cross-origin-opener-policy"]).toBe("same-origin");
    expect(h["cross-origin-embedder-policy"]).toBe("require-corp");
    expect(h["cross-origin-resource-policy"]).toBe("same-origin");
  });
});
