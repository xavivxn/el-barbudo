import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  product: { findMany: vi.fn(), findUnique: vi.fn() },
  variant: { findMany: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));

import {
  getProductBySlug,
  getVariantSnapshots,
  listProducts,
} from "@/lib/products";

function row(over: Record<string, unknown> = {}) {
  return {
    id: "p1",
    slug: "bleu",
    name: "Bleu",
    subtitle: "Eau de parfum",
    category: "perfume",
    description: "desc",
    notes: null,
    benefits: "[]",
    tags: "[]",
    images: "[]",
    featured: false,
    active: true,
    createdAt: new Date("2026-01-01"),
    variants: [{ id: "v1", productId: "p1", label: "50 ml", price: 100, stock: 3 }],
    ...over,
  };
}

beforeEach(() => vi.resetAllMocks());

describe("getProductBySlug", () => {
  it("devuelve null si el slug no existe", async () => {
    db.product.findUnique.mockResolvedValue(null);
    expect(await getProductBySlug("no-existe")).toBeNull();
    expect(db.product.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "no-existe" } }),
    );
  });

  it("devuelve null si el producto está inactivo", async () => {
    db.product.findUnique.mockResolvedValue(row({ active: false }));
    expect(await getProductBySlug("bleu")).toBeNull();
  });

  it("devuelve el DTO si el producto está activo", async () => {
    db.product.findUnique.mockResolvedValue(row());
    const dto = await getProductBySlug("bleu");
    expect(dto).toMatchObject({ id: "p1", slug: "bleu", active: true });
    expect(dto?.variants).toEqual([{ id: "v1", label: "50 ml", price: 100, stock: 3 }]);
  });
});

describe("getVariantSnapshots", () => {
  it("marca available según el producto y omite ids desconocidos", async () => {
    db.variant.findMany.mockResolvedValue([
      { id: "v1", price: 100, stock: 3, product: { active: true } },
      { id: "v2", price: 200, stock: 5, product: { active: false } },
    ]);
    const out = await getVariantSnapshots(["v1", "v2", "desconocido"]);
    expect(out).toEqual([
      { id: "v1", price: 100, stock: 3, available: true },
      { id: "v2", price: 200, stock: 5, available: false },
    ]);
    expect(db.variant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["v1", "v2", "desconocido"] } } }),
    );
  });

  it("no consulta la base con una lista vacía", async () => {
    expect(await getVariantSnapshots([])).toEqual([]);
    expect(db.variant.findMany).not.toHaveBeenCalled();
  });
});

describe("listProducts", () => {
  it("consulta solo activos por defecto", async () => {
    db.product.findMany.mockResolvedValue([]);
    await listProducts();
    expect(db.product.findMany.mock.calls[0][0].where).toEqual({ active: true });
  });

  it("includeInactive quita el filtro de activos", async () => {
    db.product.findMany.mockResolvedValue([]);
    await listProducts({ includeInactive: true });
    expect(db.product.findMany.mock.calls[0][0].where).not.toHaveProperty("active");
  });

  it("pasa categoría y destacados a la consulta", async () => {
    db.product.findMany.mockResolvedValue([]);
    await listProducts({ category: "barba", featuredOnly: true });
    expect(db.product.findMany.mock.calls[0][0].where).toEqual({
      active: true,
      category: "barba",
      featured: true,
    });
  });

  it("filtra por etiqueta después de parsear", async () => {
    db.product.findMany.mockResolvedValue([
      row({ id: "a", tags: '["fresco","día"]' }),
      row({ id: "b", tags: '["dulce"]' }),
      row({ id: "c", tags: "no-json" }),
    ]);
    const out = await listProducts({ tag: "fresco" });
    expect(out.map((p) => p.id)).toEqual(["a"]);
    expect(db.product.findMany.mock.calls[0][0].where).not.toHaveProperty("tag");
  });
});
