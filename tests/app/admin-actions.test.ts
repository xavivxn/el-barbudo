import { beforeEach, describe, expect, it, vi } from "vitest";

const order: string[] = [];

const tx = vi.hoisted(() => ({
  product: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  variant: { update: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
}));
const db = vi.hoisted(() => ({
  product: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  variant: { update: vi.fn(), updateMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: db }));

const requireAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ requireAdmin }));

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
);
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect,
}));

import { markSoldOut, saveProduct, toggleProductFlag, updateVariant } from "@/app/admin/actions";

const NO_SESSION = new Error("NEXT_REDIRECT:/admin/login");

beforeEach(() => {
  vi.resetAllMocks();
  order.length = 0;
  requireAdmin.mockImplementation(async () => void order.push("auth"));
  redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
  db.$transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
});

function productForm(entries: Record<string, string> = {}, variants: Record<string, string>[] = []) {
  const data = new FormData();
  const base: Record<string, string> = {
    name: "Aceite de barba",
    slug: "aceite-de-barba",
    subtitle: "30 ml",
    category: "barba",
    description: "Suaviza.",
    benefits: "Hidrata",
    tags: "Barba, aceite",
    images: "https://x.com/a.jpg",
    active: "on",
    ...entries,
  };
  for (const [key, value] of Object.entries(base)) data.append(key, value);
  const rows = variants.length ? variants : [{ label: "30 ml", price: "85.000", stock: "3" }];
  rows.forEach((row, i) => {
    for (const [key, value] of Object.entries(row)) data.append(`variants.${i}.${key}`, value);
  });
  return data;
}

describe("sin sesión ninguna action escribe", () => {
  beforeEach(() => {
    requireAdmin.mockImplementation(async () => {
      throw NO_SESSION;
    });
  });

  it.each([
    ["updateVariant", () => updateVariant("v1", { price: "100" })],
    ["markSoldOut", () => markSoldOut("p1")],
    ["toggleProductFlag", () => toggleProductFlag("p1", "active", true)],
    ["saveProduct", () => saveProduct({}, productForm())],
  ])("%s redirige antes de tocar la base", async (_name, call) => {
    await expect(call()).rejects.toThrow("NEXT_REDIRECT:/admin/login");
    expect(db.variant.update).not.toHaveBeenCalled();
    expect(db.variant.updateMany).not.toHaveBeenCalled();
    expect(db.product.update).not.toHaveBeenCalled();
    expect(db.product.updateMany).not.toHaveBeenCalled();
    expect(db.product.findUnique).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateVariant", () => {
  it("guarda el precio escrito con puntos como entero y revalida la tienda", async () => {
    db.variant.update.mockResolvedValue({});
    const result = await updateVariant("v1", { price: "350.000" });
    expect(result).toEqual({ ok: true });
    expect(db.variant.update).toHaveBeenCalledWith({ where: { id: "v1" }, data: { price: 350000 } });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("guarda precio y stock juntos", async () => {
    db.variant.update.mockResolvedValue({});
    await updateVariant("v1", { price: " 285 000 ", stock: "0" });
    expect(db.variant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { price: 285000, stock: 0 },
    });
  });

  it.each(["-5", "12,5", "", "12.5", "0"])("rechaza el precio %j sin guardar", async (price) => {
    expect(await updateVariant("v1", { price })).toEqual({
      error: "Ingresá un precio en guaraníes, sin decimales.",
    });
    expect(db.variant.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each(["-1", "1,5", "", "abc"])("rechaza el stock %j sin guardar", async (stock) => {
    expect(await updateVariant("v1", { stock })).toEqual({
      error: "Ingresá un número entero, 0 o más.",
    });
    expect(db.variant.update).not.toHaveBeenCalled();
  });

  it("sin nada para guardar no escribe", async () => {
    expect(await updateVariant("v1", {})).toEqual({ ok: true });
    expect(db.variant.update).not.toHaveBeenCalled();
  });

  it("no confía en la forma de la entrada", async () => {
    const bad = await updateVariant(7 as unknown as string, { price: "100" });
    expect(bad).toHaveProperty("error");
    expect(db.variant.update).not.toHaveBeenCalled();
    const alsoBad = await updateVariant("v1", { price: 100 as unknown as string });
    expect(alsoBad).toHaveProperty("error");
  });

  it("una variante que ya no existe devuelve un error legible", async () => {
    db.variant.update.mockRejectedValue(Object.assign(new Error("x"), { code: "P2025" }));
    expect(await updateVariant("v1", { stock: "2" })).toEqual({
      error: "No encontramos esta variante. Recargá la página.",
    });
  });

  it("verifica la sesión antes de escribir", async () => {
    db.variant.update.mockImplementation(async () => void order.push("write"));
    await updateVariant("v1", { stock: "2" });
    expect(order).toEqual(["auth", "write"]);
  });
});

describe("markSoldOut", () => {
  it("pone en 0 todas las variantes del producto", async () => {
    db.variant.updateMany.mockResolvedValue({ count: 2 });
    expect(await markSoldOut("p1")).toEqual({ ok: true });
    expect(db.variant.updateMany).toHaveBeenCalledWith({ where: { productId: "p1" }, data: { stock: 0 } });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rechaza ids que no son texto", async () => {
    expect(await markSoldOut({ not: "a string" } as unknown as string)).toHaveProperty("error");
    expect(db.variant.updateMany).not.toHaveBeenCalled();
  });
});

describe("toggleProductFlag", () => {
  it.each(["featured", "active"] as const)("fija %s en el valor pedido sin leer antes", async (flag) => {
    await toggleProductFlag("p1", flag, true);
    expect(db.product.updateMany).toHaveBeenCalledWith({ where: { id: "p1" }, data: { [flag]: true } });
    expect(db.product.findUnique).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("es idempotente: pedir false dos veces escribe false las dos veces", async () => {
    await toggleProductFlag("p1", "active", false);
    await toggleProductFlag("p1", "active", false);
    expect(db.product.updateMany.mock.calls).toEqual([
      [{ where: { id: "p1" }, data: { active: false } }],
      [{ where: { id: "p1" }, data: { active: false } }],
    ]);
  });

  it("solo acepta featured o active y un valor booleano", async () => {
    await toggleProductFlag("p1", "name" as unknown as "active", true);
    await toggleProductFlag("p1", "active", "false" as unknown as boolean);
    await toggleProductFlag(7 as unknown as string, "active", true);
    expect(db.product.updateMany).not.toHaveBeenCalled();
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it("verifica la sesión antes de escribir", async () => {
    db.product.updateMany.mockImplementation(async () => void order.push("write"));
    await toggleProductFlag("p1", "active", true);
    expect(order).toEqual(["auth", "write"]);
  });
});

describe("saveProduct", () => {
  it("con datos inválidos devuelve errores por campo y no escribe", async () => {
    const state = await saveProduct({}, productForm({ name: "" }, [{ label: "", price: "-5", stock: "1,5" }]));
    expect(state.errors).toMatchObject({
      name: "Escribí el nombre del producto.",
      "variants.0.label": "Escribí el tamaño o presentación.",
      "variants.0.price": "Ingresá un precio en guaraníes, sin decimales.",
      "variants.0.stock": "Ingresá un número entero, 0 o más.",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.product.create).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("crea el producto con campos JSON serializados y vuelve al panel", async () => {
    db.product.create.mockResolvedValue({});
    await expect(saveProduct({}, productForm())).rejects.toThrow("NEXT_REDIRECT:/admin?guardado=1");
    const { data } = db.product.create.mock.calls[0][0];
    expect(data).toMatchObject({
      slug: "aceite-de-barba",
      category: "barba",
      notes: null,
      benefits: JSON.stringify(["Hidrata"]),
      tags: JSON.stringify(["barba", "aceite"]),
      images: JSON.stringify(["https://x.com/a.jpg"]),
      featured: false,
      active: true,
    });
    expect(data.variants.create).toEqual([{ label: "30 ml", price: 85000, stock: 3 }]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("un perfume guarda sus notas como JSON y descarta los beneficios", async () => {
    db.product.create.mockResolvedValue({});
    const form = productForm({ category: "perfume", benefits: "ignorado" });
    form.append("notes.top", "Pomelo");
    form.append("notes.heart", "Jengibre");
    form.append("notes.base", "Cedro");
    await expect(saveProduct({}, form)).rejects.toThrow("NEXT_REDIRECT");
    const { data } = db.product.create.mock.calls[0][0];
    expect(data.notes).toBe(JSON.stringify({ top: "Pomelo", heart: "Jengibre", base: "Cedro" }));
    expect(data.benefits).toBe("[]");
  });

  it("un slug repetido (P2002) se muestra en el campo slug", async () => {
    db.product.create.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    const state = await saveProduct({}, productForm());
    expect(state.errors).toEqual({ slug: "Ya existe un producto con esta dirección." });
    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("un error inesperado no se traga: devuelve un mensaje y no redirige", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.product.create.mockRejectedValue(new Error("disco lleno"));
    const state = await saveProduct({}, productForm());
    expect(state.message).toBe("No pudimos guardar el producto. Probá de nuevo.");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("un notFound de Next dentro de la escritura no se convierte en mensaje", async () => {
    const { notFound } = await vi.importActual<typeof import("next/navigation")>("next/navigation");
    let nextError: unknown;
    try {
      notFound();
    } catch (error) {
      nextError = error;
    }
    db.product.create.mockRejectedValue(nextError);
    await expect(saveProduct({}, productForm())).rejects.toBe(nextError);
  });

  describe("editar", () => {
    const existing = { variants: [{ id: "v1" }, { id: "v2" }] };
    const loaded = { productId: "p1", loadedVariantIds: "v1,v2" };

    it("actualiza por id, crea las nuevas y borra solo las quitadas, todo en una transacción", async () => {
      tx.product.findUnique.mockResolvedValue(existing);
      const form = productForm(loaded, [
        { id: "v1", label: "30 ml", price: "90.000", stock: "5", origPrice: "85000", origStock: "3" },
        { id: "", label: "60 ml", price: "150.000", stock: "2" },
      ]);
      await expect(saveProduct({}, form)).rejects.toThrow("NEXT_REDIRECT:/admin?guardado=1");

      expect(db.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "p1" }, data: expect.objectContaining({ slug: "aceite-de-barba" }) }),
      );
      expect(tx.variant.deleteMany).toHaveBeenCalledWith({ where: { productId: "p1", id: { in: ["v2"] } } });
      expect(tx.variant.update).toHaveBeenCalledWith({
        where: { id: "v1" },
        data: { label: "30 ml", price: 90000, stock: 5 },
      });
      expect(tx.variant.createMany).toHaveBeenCalledWith({
        data: [{ productId: "p1", label: "60 ml", price: 150000, stock: 2 }],
      });
      expect(db.product.create).not.toHaveBeenCalled();
    });

    it("un stock sin tocar en el formulario no pisa un valor más nuevo de la base", async () => {
      tx.product.findUnique.mockResolvedValue(existing);
      // El formulario se abrió con stock 3; después el listado lo dejó en 0. Acá solo se cambió el precio.
      const form = productForm(loaded, [
        { id: "v1", label: "30 ml", price: "90.000", stock: "3", origPrice: "85000", origStock: "3" },
        { id: "v2", label: "60 ml", price: "150.000", stock: "2", origPrice: "150000", origStock: "2" },
      ]);
      await expect(saveProduct({}, form)).rejects.toThrow("NEXT_REDIRECT");
      expect(tx.variant.update).toHaveBeenCalledWith({ where: { id: "v1" }, data: { label: "30 ml", price: 90000 } });
      expect(tx.variant.update).toHaveBeenCalledWith({ where: { id: "v2" }, data: { label: "60 ml" } });
    });

    it("un precio sin tocar tampoco se reescribe, y el cambiado sí", async () => {
      tx.product.findUnique.mockResolvedValue(existing);
      const form = productForm(loaded, [
        { id: "v1", label: "30 ml", price: "85.000", stock: "9", origPrice: "85000", origStock: "3" },
        { id: "v2", label: "60 ml", price: "150.000", stock: "2", origPrice: "150000", origStock: "2" },
      ]);
      await expect(saveProduct({}, form)).rejects.toThrow("NEXT_REDIRECT");
      expect(tx.variant.update).toHaveBeenCalledWith({ where: { id: "v1" }, data: { label: "30 ml", stock: 9 } });
    });

    it("sin los valores originales (formulario viejo) escribe precio y stock", async () => {
      tx.product.findUnique.mockResolvedValue(existing);
      const form = productForm(loaded, [{ id: "v1", label: "30 ml", price: "90.000", stock: "5" }]);
      await expect(saveProduct({}, form)).rejects.toThrow("NEXT_REDIRECT");
      expect(tx.variant.update).toHaveBeenCalledWith({
        where: { id: "v1" },
        data: { label: "30 ml", price: 90000, stock: 5 },
      });
    });

    it("una variante creada después de abrir el formulario no se borra", async () => {
      // v3 la agregaron desde otra pestaña: está en la base pero no en loadedVariantIds.
      tx.product.findUnique.mockResolvedValue({ variants: [{ id: "v1" }, { id: "v2" }, { id: "v3" }] });
      const form = productForm(loaded, [
        { id: "v1", label: "30 ml", price: "85.000", stock: "3", origPrice: "85000", origStock: "3" },
      ]);
      await expect(saveProduct({}, form)).rejects.toThrow("NEXT_REDIRECT");
      expect(tx.variant.deleteMany).toHaveBeenCalledTimes(1);
      expect(tx.variant.deleteMany).toHaveBeenCalledWith({ where: { productId: "p1", id: { in: ["v2"] } } });
    });

    it("sin variantes quitadas no borra nada", async () => {
      tx.product.findUnique.mockResolvedValue(existing);
      const form = productForm(loaded, [
        { id: "v1", label: "a", price: "1.000", stock: "1", origPrice: "1000", origStock: "1" },
        { id: "v2", label: "b", price: "1.000", stock: "1", origPrice: "1000", origStock: "1" },
      ]);
      await expect(saveProduct({}, form)).rejects.toThrow("NEXT_REDIRECT");
      expect(tx.variant.deleteMany).not.toHaveBeenCalled();
    });

    it("un id que pertenece a otro producto se trata como variante nueva y no borra nada ajeno", async () => {
      tx.product.findUnique.mockResolvedValue(existing);
      const form = productForm({ productId: "p1", loadedVariantIds: "ajena" }, [
        { id: "ajena", label: "x", price: "1.000", stock: "1" },
      ]);
      await expect(saveProduct({}, form)).rejects.toThrow("NEXT_REDIRECT");
      expect(tx.variant.update).not.toHaveBeenCalled();
      expect(tx.variant.deleteMany).not.toHaveBeenCalled();
      expect(tx.variant.createMany).toHaveBeenCalledWith({
        data: [{ productId: "p1", label: "x", price: 1000, stock: 1 }],
      });
    });

    it("un producto que ya no existe no se recrea", async () => {
      tx.product.findUnique.mockResolvedValue(null);
      const state = await saveProduct({}, productForm({ productId: "p1" }));
      expect(state.message).toBe("No encontramos este producto. Puede que ya lo hayan borrado.");
      expect(redirect).not.toHaveBeenCalled();
    });

    it("el slug repetido al editar también se marca en el campo", async () => {
      tx.product.findUnique.mockResolvedValue(existing);
      tx.product.update.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
      const state = await saveProduct({}, productForm({ productId: "p1" }));
      expect(state.errors).toEqual({ slug: "Ya existe un producto con esta dirección." });
    });
  });

  it("verifica la sesión antes de leer el envío", async () => {
    db.product.create.mockImplementation(async () => void order.push("write"));
    await expect(saveProduct({}, productForm())).rejects.toThrow("NEXT_REDIRECT");
    expect(order).toEqual(["auth", "write"]);
  });
});
