import { describe, expect, it } from "vitest";
import { matchFragrances } from "@/lib/finder";
import type { ProductDTO } from "@/lib/types";

const inStock = [{ id: "v", label: "50 ml", price: 100000, stock: 3 }];
const outOfStock = [{ id: "v", label: "50 ml", price: 100000, stock: 0 }];

function product(id: string, overrides: Partial<ProductDTO>): ProductDTO {
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
    variants: inStock,
    ...overrides,
  };
}

const nocheAmaderado = product("noche-amaderado", { tags: ["noche", "amaderado"], featured: true });
const diaFresco = product("dia-fresco", { tags: ["día", "fresco"], featured: true });
const nocheDulceAgotado = product("noche-dulce", { tags: ["noche", "dulce"], variants: outOfStock });
const barbaNoche = product("barba-noche", { category: "barba", tags: ["noche"], featured: true });
const all = [nocheDulceAgotado, nocheAmaderado, diaFresco, barbaNoche];

describe("matchFragrances", () => {
  it("devuelve solo los exactos cuando existen", () => {
    expect(matchFragrances(all, { moment: "noche", styles: ["amaderado"] })).toEqual({
      exact: true,
      results: [nocheAmaderado],
    });
  });

  it("sin selección muestra todos los perfumes: disponibles primero y, dentro de cada grupo, los destacados al final", () => {
    const plainA = product("plain-a", {});
    const plainB = product("plain-b", {});
    const featuredSoldOut = product("destacado-agotado", { featured: true, variants: outOfStock });
    const result = matchFragrances([nocheAmaderado, featuredSoldOut, plainA, nocheDulceAgotado, diaFresco, plainB, barbaNoche], {
      styles: [],
    });
    expect(result.exact).toBe(true);
    expect(result.results.map((p) => p.id)).toEqual([
      plainA.id,
      plainB.id,
      nocheAmaderado.id,
      diaFresco.id,
      nocheDulceAgotado.id,
      featuredSoldOut.id,
    ]);
  });

  it("sin selección ni destacados muestra todos los perfumes en su orden", () => {
    const plain = [product("x", {}), product("y", {}), barbaNoche];
    expect(matchFragrances(plain, { styles: [] })).toEqual({ exact: true, results: [plain[0], plain[1]] });
  });

  it("sin coincidencia exacta devuelve parciales, nunca vacío", () => {
    const partial = matchFragrances(all, { moment: "día", styles: ["dulce"] });
    expect(partial.exact).toBe(false);
    expect(partial.results.length).toBeGreaterThan(0);
    // diaFresco (momento) y nocheDulceAgotado (estilo) puntúan 1; el agotado queda al final.
    expect(partial.results.map((p) => p.id)).toEqual([diaFresco.id, nocheDulceAgotado.id]);
  });

  it("ordena los parciales por puntaje descendente", () => {
    const a = product("a", { tags: ["dulce"] });
    const b = product("b", { tags: ["noche", "dulce"] });
    const result = matchFragrances([a, b], { moment: "noche", styles: ["dulce", "fresco"] });
    expect(result.exact).toBe(false);
    expect(result.results.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("los agotados van al final y los de otra categoría no entran", () => {
    const result = matchFragrances(all, { moment: "noche", styles: [] });
    expect(result.exact).toBe(true);
    expect(result.results.at(-1)).toBe(nocheDulceAgotado);
    expect(result.results).not.toContain(barbaNoche);
  });

  it("sin ningún puntaje: no exacto y todos los perfumes, disponibles primero", () => {
    const none = matchFragrances([nocheDulceAgotado, nocheAmaderado], { moment: "día", styles: ["natural"] });
    expect(none.exact).toBe(false);
    expect(none.results).toEqual([nocheAmaderado, nocheDulceAgotado]);
  });
});
