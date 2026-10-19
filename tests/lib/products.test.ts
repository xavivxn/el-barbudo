import { describe, expect, it } from "vitest";
import { pickRelated, toProductDTO } from "@/lib/products";
import type { ProductDTO } from "@/lib/types";

const row = {
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
  variants: [],
};

function dto(id: string, over: Partial<ProductDTO> = {}): ProductDTO {
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
    ...over,
  };
}

describe("toProductDTO", () => {
  it("parsea JSON y tolera JSON roto", () => {
    const out = toProductDTO({
      ...row,
      tags: '["amaderado","noche"]',
      images: "no-json",
      notes: null,
      benefits: "[]",
      variants: [],
    });
    expect(out.tags).toEqual(["amaderado", "noche"]);
    expect(out.images).toEqual([]);
    expect(out.category).toBe("perfume");
    expect(out.notes).toBeNull();
  });

  it("parsea notas y variantes", () => {
    const out = toProductDTO({
      ...row,
      notes: '{"top":"a","heart":"b","base":"c"}',
      variants: [{ id: "v1", label: "50 ml", price: 100, stock: 3 }],
    });
    expect(out.notes).toEqual({ top: "a", heart: "b", base: "c" });
    expect(out.variants).toEqual([{ id: "v1", label: "50 ml", price: 100, stock: 3 }]);
  });

  it("descarta notas mal formadas y arrays con elementos no string", () => {
    const out = toProductDTO({
      ...row,
      notes: '{"top":1}',
      tags: '["a", 2, null]',
    });
    expect(out.notes).toBeNull();
    expect(out.tags).toEqual(["a"]);
  });

  it("categoría desconocida cae en perfume", () => {
    expect(toProductDTO({ ...row, category: "otra" }).category).toBe("perfume");
  });
});

describe("pickRelated", () => {
  const p = dto("p", { tags: ["fresco"] });
  const sameCat = dto("sameCat", { tags: [] });
  const sharedTag = dto("sharedTag", { category: "barba", tags: ["fresco"] });
  const unrelated = dto("unrelated", { category: "cabello", tags: ["dulce"] });
  const inactiveSameCat = dto("inactive", { active: false });

  it("excluye el propio e inactivos; misma categoría primero, luego etiqueta", () => {
    expect(
      pickRelated(p, [p, sameCat, sharedTag, unrelated, inactiveSameCat]).map((x) => x.id),
    ).toEqual(["sameCat", "sharedTag"]);
  });

  it("respeta limit (default 4)", () => {
    const many = Array.from({ length: 8 }, (_, i) => dto(`c${i}`));
    expect(pickRelated(p, many)).toHaveLength(4);
    expect(pickRelated(p, many, 2)).toHaveLength(2);
  });
});
