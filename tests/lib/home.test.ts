import { describe, expect, it } from "vitest";
import { groupByCategory } from "@/lib/home";
import type { Category, ProductDTO } from "@/lib/types";

function dto(id: string, category: Category): ProductDTO {
  return {
    id,
    slug: id,
    name: id,
    subtitle: "",
    category,
    description: "",
    notes: null,
    benefits: [],
    tags: [],
    images: [],
    featured: false,
    active: true,
    variants: [],
  };
}

const perfume1 = dto("perfume1", "perfume");
const perfume2 = dto("perfume2", "perfume");
const perfume3 = dto("perfume3", "perfume");
const perfume4 = dto("perfume4", "perfume");
const perfume5 = dto("perfume5", "perfume");
const barba1 = dto("barba1", "barba");
const cabello1 = dto("cabello1", "cabello");

describe("groupByCategory", () => {
  it("sigue el orden de CATEGORIES, recorta a 4 por sección y cuenta el total", () => {
    const groups = groupByCategory([
      perfume1,
      barba1,
      perfume2,
      perfume3,
      perfume4,
      perfume5,
      cabello1,
    ]);
    expect(groups.map((g) => g.category.value)).toEqual(["perfume", "barba", "cabello"]);
    expect(groups[0].products).toHaveLength(4);
    expect(groups[0].products.map((p) => p.id)).toEqual([
      "perfume1",
      "perfume2",
      "perfume3",
      "perfume4",
    ]);
    expect(groups[0].total).toBe(5);
    expect(groups[1].products).toEqual([barba1]);
    expect(groups[1].total).toBe(1);
  });

  it("omite las categorías vacías", () => {
    expect(groupByCategory([barba1]).map((g) => g.category.value)).toEqual(["barba"]);
    expect(groupByCategory([])).toEqual([]);
  });

  it("deja afuera los excluidos sin cambiar el total de la categoría", () => {
    const groups = groupByCategory(
      [perfume1, perfume2, perfume3, perfume4, perfume5, barba1],
      4,
      new Set(["perfume1", "perfume3"]),
    );
    expect(groups[0].products.map((p) => p.id)).toEqual(["perfume2", "perfume4", "perfume5"]);
    expect(groups[0].total).toBe(5);
  });

  it("si excluir vacía una categoría con productos, la muestra sin excluir (la pestaña no desaparece)", () => {
    const groups = groupByCategory([perfume1, perfume2, barba1], 4, new Set(["perfume1", "perfume2", "barba1"]));
    expect(groups.map((g) => g.category.value)).toEqual(["perfume", "barba"]);
    expect(groups[0].products.map((p) => p.id)).toEqual(["perfume1", "perfume2"]);
    expect(groups[0].total).toBe(2);
    expect(groups[1].products).toEqual([barba1]);
  });

  it("el respaldo sin excluir también respeta perSection", () => {
    const [perfumes] = groupByCategory([perfume1, perfume2, perfume3], 2, new Set(["perfume1", "perfume2", "perfume3"]));
    expect(perfumes.products.map((p) => p.id)).toEqual(["perfume1", "perfume2"]);
  });

  it("respeta perSection", () => {
    const [perfumes] = groupByCategory([perfume1, perfume2, perfume3], 2);
    expect(perfumes.products.map((p) => p.id)).toEqual(["perfume1", "perfume2"]);
    expect(perfumes.total).toBe(3);
  });
});
