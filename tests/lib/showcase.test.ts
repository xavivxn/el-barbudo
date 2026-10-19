import { describe, expect, it } from "vitest";
import { pickShowcase, wrapIndex } from "@/lib/showcase";
import type { ProductDTO } from "@/lib/types";

function product(id: string, overrides: Partial<ProductDTO> = {}): ProductDTO {
  return {
    id,
    slug: id,
    name: id,
    subtitle: "",
    category: "perfume",
    description: "",
    notes: null,
    benefits: [],
    tags: [],
    images: [],
    featured: false,
    active: true,
    variants: [],
    ...overrides,
  };
}

describe("wrapIndex", () => {
  it("da la vuelta en ambos sentidos", () => {
    expect(wrapIndex(-1, 4)).toBe(3);
    expect(wrapIndex(4, 4)).toBe(0);
    expect(wrapIndex(2, 4)).toBe(2);
    expect(wrapIndex(-5, 4)).toBe(3);
  });

  it("con lista vacía devuelve 0", () => {
    expect(wrapIndex(0, 0)).toBe(0);
    expect(wrapIndex(3, 0)).toBe(0);
  });
});

describe("pickShowcase", () => {
  const a = product("a");
  const featB = product("b", { featured: true });
  const c = product("c");
  const featD = product("d", { featured: true });

  it("prefiere los destacados, en orden", () => {
    expect(pickShowcase([a, featB, c, featD]).map((p) => p.id)).toEqual([featB.id, featD.id]);
  });

  it("sin destacados toma los primeros max", () => {
    expect(pickShowcase([a, c], 1).map((p) => p.id)).toEqual([a.id]);
    expect(pickShowcase([a, c]).map((p) => p.id)).toEqual([a.id, c.id]);
  });

  it("ignora destacados inactivos y respeta max", () => {
    const inactive = product("x", { featured: true, active: false });
    expect(pickShowcase([inactive, a, featB]).map((p) => p.id)).toEqual([featB.id]);
    const many = ["1", "2", "3", "4", "5", "6"].map((id) => product(id, { featured: true }));
    expect(pickShowcase(many)).toHaveLength(5);
    expect(pickShowcase(many, 2).map((p) => p.id)).toEqual(["1", "2"]);
  });
});
