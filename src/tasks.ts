import { randomUUID } from "node:crypto";

export interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaskInput = { title?: unknown; done?: unknown };

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export const MAX_TITLE_LENGTH = 120;

function parseTitle(value: unknown): string {
  if (typeof value !== "string") throw new ValidationError("El campo 'title' debe ser texto");
  const title = value.trim();
  if (title.length === 0) throw new ValidationError("El campo 'title' no puede estar vacío");
  if (title.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`El campo 'title' admite como máximo ${MAX_TITLE_LENGTH} caracteres`);
  }
  return title;
}

function parseDone(value: unknown): boolean {
  if (typeof value !== "boolean") throw new ValidationError("El campo 'done' debe ser booleano");
  return value;
}

/** Almacén en memoria. Se puede reemplazar por una base de datos sin cambiar la API HTTP. */
export class TaskStore {
  private readonly tasks = new Map<string, Task>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  list(): Task[] {
    return [...this.tasks.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  create(input: TaskInput): Task {
    const stamp = this.now().toISOString();
    const task: Task = {
      id: randomUUID(),
      title: parseTitle(input.title),
      done: input.done === undefined ? false : parseDone(input.done),
      createdAt: stamp,
      updatedAt: stamp,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  update(id: string, input: TaskInput): Task | undefined {
    const current = this.tasks.get(id);
    if (!current) return undefined;
    if (input.title === undefined && input.done === undefined) {
      throw new ValidationError("Debe indicar 'title' o 'done'");
    }
    const updated: Task = {
      ...current,
      title: input.title === undefined ? current.title : parseTitle(input.title),
      done: input.done === undefined ? current.done : parseDone(input.done),
      updatedAt: this.now().toISOString(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  stats(): { total: number; done: number; pending: number } {
    const all = this.list();
    const done = all.filter((t) => t.done).length;
    return { total: all.length, done, pending: all.length - done };
  }
}
