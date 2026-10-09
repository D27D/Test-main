import { describe, expect, it } from "vitest";
import { MAX_TITLE_LENGTH, TaskStore, ValidationError } from "../src/tasks.js";

describe("TaskStore", () => {
  it("crea tareas pendientes con título normalizado", () => {
    const store = new TaskStore();
    const task = store.create({ title: "  Revisar inventario  " });
    expect(task.title).toBe("Revisar inventario");
    expect(task.done).toBe(false);
    expect(store.get(task.id)).toEqual(task);
  });

  it("rechaza títulos vacíos, no textuales o demasiado largos", () => {
    const store = new TaskStore();
    expect(() => store.create({ title: "   " })).toThrow(ValidationError);
    expect(() => store.create({ title: 42 })).toThrow(ValidationError);
    expect(() => store.create({ title: "x".repeat(MAX_TITLE_LENGTH + 1) })).toThrow(ValidationError);
    expect(() => store.create({ title: "ok", done: "sí" })).toThrow(ValidationError);
  });

  it("actualiza y elimina tareas", () => {
    let t = 0;
    const store = new TaskStore(() => new Date(Date.UTC(2026, 0, 1, 0, 0, t++)));
    const task = store.create({ title: "Despachar pedido" });
    const updated = store.update(task.id, { done: true });
    expect(updated?.done).toBe(true);
    expect(updated?.updatedAt).not.toBe(task.updatedAt);
    expect(() => store.update(task.id, {})).toThrow(ValidationError);
    expect(store.update("no-existe", { done: true })).toBeUndefined();
    expect(store.delete(task.id)).toBe(true);
    expect(store.delete(task.id)).toBe(false);
  });

  it("lista en orden de creación y calcula estadísticas", () => {
    let t = 0;
    const store = new TaskStore(() => new Date(Date.UTC(2026, 0, 1, 0, 0, t++)));
    const a = store.create({ title: "A" });
    store.create({ title: "B", done: true });
    expect(store.list().map((x) => x.title)).toEqual(["A", "B"]);
    expect(store.stats()).toEqual({ total: 2, done: 1, pending: 1 });
    store.update(a.id, { title: "A2", done: true });
    expect(store.stats()).toEqual({ total: 2, done: 2, pending: 0 });
  });
});
