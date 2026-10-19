import { beforeEach, describe, expect, it, vi } from "vitest";

const order: string[] = [];

const tx = vi.hoisted(() => ({
  service: { findMany: vi.fn(), update: vi.fn(), aggregate: vi.fn(), create: vi.fn() },
}));
const db = vi.hoisted(() => ({
  service: { updateMany: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: db }));

const requireAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ requireAdmin }));

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

import { deleteService, moveService, saveService } from "@/app/admin/service-actions";

const NO_SESSION = new Error("NEXT_REDIRECT:/admin/login");

beforeEach(() => {
  vi.resetAllMocks();
  order.length = 0;
  requireAdmin.mockImplementation(async () => void order.push("auth"));
  db.$transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => {
    order.push("write");
    return fn(tx);
  });
});

function serviceForm(entries: Record<string, string> = {}) {
  const data = new FormData();
  const base: Record<string, string> = {
    name: "Corte + barba",
    description: "Con toalla caliente.",
    price: "120.000",
    order: "3",
    ...entries,
  };
  for (const [key, value] of Object.entries(base)) data.append(key, value);
  return data;
}

/** Servicios tal como los devuelve la base, en el orden de la consulta. */
function rows(...orders: [string, number][]) {
  tx.service.findMany.mockResolvedValue(orders.map(([id, o]) => ({ id, order: o })));
}

const updates = () => tx.service.update.mock.calls.map(([arg]) => [arg.where.id, arg.data.order]);

describe("sin sesión ninguna action escribe", () => {
  beforeEach(() => {
    requireAdmin.mockImplementation(async () => {
      throw NO_SESSION;
    });
  });

  it.each([
    ["saveService", () => saveService({}, serviceForm())],
    ["deleteService", () => deleteService("s1")],
    ["moveService", () => moveService("s1", "up")],
  ])("%s redirige antes de tocar la base", async (_name, call) => {
    await expect(call()).rejects.toBe(NO_SESSION);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.service.updateMany).not.toHaveBeenCalled();
    expect(db.service.deleteMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("saveService", () => {
  it("con datos inválidos devuelve los errores y no escribe", async () => {
    const result = await saveService({}, serviceForm({ name: "", price: "abc" }));
    expect(result.errors).toMatchObject({
      name: "Escribí el nombre del servicio.",
      price: "Ingresá un precio en guaraníes, sin decimales.",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.service.updateMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("crea al final de la lista, sin fiarse del orden que manda el formulario", async () => {
    tx.service.aggregate.mockResolvedValue({ _max: { order: 4 } });
    const result = await saveService({}, serviceForm());
    expect(order).toEqual(["auth", "write"]);
    expect(tx.service.create).toHaveBeenCalledWith({
      data: { name: "Corte + barba", description: "Con toalla caliente.", price: 120000, order: 5 },
    });
    expect(result).toEqual({ saved: true });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("crea con orden 0 si todavía no hay servicios", async () => {
    tx.service.aggregate.mockResolvedValue({ _max: { order: null } });
    await saveService({}, serviceForm());
    expect(tx.service.create).toHaveBeenCalledWith({ data: expect.objectContaining({ order: 0 }) });
  });

  it("actualiza por id sin tocar el orden", async () => {
    db.service.updateMany.mockResolvedValue({ count: 1 });
    const result = await saveService({}, serviceForm({ id: "s1", order: "9" }));
    expect(db.service.updateMany).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { name: "Corte + barba", description: "Con toalla caliente.", price: 120000 },
    });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual({ saved: true });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("si el servicio ya no existe lo dice y no revalida", async () => {
    db.service.updateMany.mockResolvedValue({ count: 0 });
    const result = await saveService({}, serviceForm({ id: "s1" }));
    expect(result).toEqual({ message: "No encontramos este servicio. Puede que ya lo hayan borrado." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("un error de la base no se filtra: mensaje genérico", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.service.updateMany.mockRejectedValue(new Error("SQLITE_BUSY"));
    const result = await saveService({}, serviceForm({ id: "s1" }));
    expect(result).toEqual({ message: "No pudimos guardar el servicio. Probá de nuevo." });
  });
});

describe("deleteService", () => {
  it("borra solo el servicio con ese id y revalida", async () => {
    db.service.deleteMany.mockResolvedValue({ count: 1 });
    await deleteService("s2");
    expect(order).toEqual(["auth"]);
    expect(db.service.deleteMany).toHaveBeenCalledWith({ where: { id: "s2" } });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("ignora un id que no es texto o está vacío: nunca borra todo", async () => {
    await deleteService("");
    await deleteService(undefined as unknown as string);
    expect(db.service.deleteMany).not.toHaveBeenCalled();
  });
});

describe("moveService", () => {
  it("sube: intercambia el orden con el vecino de arriba dentro de una transacción", async () => {
    rows(["a", 0], ["b", 1], ["c", 2]);
    await moveService("b", "up");
    expect(order).toEqual(["auth", "write"]);
    expect(updates()).toEqual([
      ["b", 0],
      ["a", 1],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("baja: intercambia con el vecino de abajo", async () => {
    rows(["a", 0], ["b", 1], ["c", 2]);
    await moveService("b", "down");
    expect(updates()).toEqual([
      ["c", 1],
      ["b", 2],
    ]);
  });

  it("subir el primero y bajar el último no hacen nada", async () => {
    rows(["a", 0], ["b", 1]);
    await moveService("a", "up");
    await moveService("b", "down");
    expect(tx.service.update).not.toHaveBeenCalled();
  });

  it("un id que no existe o una dirección inválida no escriben", async () => {
    rows(["a", 0], ["b", 1]);
    await moveService("zzz", "up");
    await moveService("a", "left" as "up");
    expect(tx.service.update).not.toHaveBeenCalled();
  });

  it("con órdenes repetidos renumera 0..n-1 y luego intercambia", async () => {
    // a y b comparten el 0; c tiene el 1. La consulta desempata por id.
    rows(["a", 0], ["b", 0], ["c", 1]);
    await moveService("c", "up");
    expect(tx.service.findMany).toHaveBeenCalledWith({
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, order: true },
    });
    // Resultado: a=0, c=1, b=2. `a` y `c` ya valían 0 y 1: solo `b` se reescribe.
    expect(updates()).toEqual([["b", 2]]);
  });

  it("con huecos en el orden (tras borrar) también deja 0..n-1", async () => {
    rows(["a", 0], ["b", 4], ["c", 9]);
    await moveService("b", "down");
    expect(updates()).toEqual([
      ["c", 1],
      ["b", 2],
    ]);
  });
});
