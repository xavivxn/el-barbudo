import { describe, expect, it } from "vitest";
import { buildCatalogHref, categoryFromSlug, firstParam, sortFromParam, sortProducts } from "@/lib/catalog";
import type { ProductDTO } from "@/lib/types";

function product(name: string, prices: number[], stocks: number[] = prices.map(() => 1)): ProductDTO {
  return {
    id: name,
    slug: name,
    name,
    subtitle: "",
    category: "perfume",
    description: "",
    notes: null,
    benefits: [],
    tags: [],
    images: [],
    featured: false,
    active: true,
    variants: prices.map((price, i) => ({ id: `${name}-${i}`, label: `${i}`, price, stock: stocks[i] })),
  };
}

describe("buildCatalogHref", () => {
  it("sin filtros apunta a /productos", () => {
    expect(buildCatalogHref({}, {})).toBe("/productos");
  });

  it("cambiar la categoría conserva la etiqueta", () => {
    expect(buildCatalogHref({ categoria: "barba", etiqueta: "amaderado" }, { categoria: "cabello" })).toBe(
      "/productos?categoria=cabello&etiqueta=amaderado",
    );
  });

  it("cambiar la etiqueta conserva la categoría", () => {
    expect(buildCatalogHref({ categoria: "barba" }, { etiqueta: "natural" })).toBe(
      "/productos?categoria=barba&etiqueta=natural",
    );
  });

  it("null quita el parámetro", () => {
    expect(buildCatalogHref({ categoria: "barba", etiqueta: "natural" }, { etiqueta: null })).toBe(
      "/productos?categoria=barba",
    );
    expect(buildCatalogHref({ categoria: "barba" }, { categoria: null })).toBe("/productos");
  });

  it("\"Todos\" quita la categoría y deja la etiqueta si hay una", () => {
    expect(buildCatalogHref({ categoria: "perfumes", etiqueta: "noche" }, { categoria: null })).toBe(
      "/productos?etiqueta=noche",
    );
  });

  it("codifica los valores", () => {
    expect(buildCatalogHref({}, { etiqueta: "día & noche?" })).toBe(
      "/productos?etiqueta=d%C3%ADa%20%26%20noche%3F",
    );
  });

  it("trata el texto vacío como ausente", () => {
    expect(buildCatalogHref({ categoria: "", etiqueta: "" }, {})).toBe("/productos");
  });

  it("conserva el orden, salvo el de por defecto, que no va en la URL", () => {
    expect(buildCatalogHref({ categoria: "barba", orden: "precio-asc" }, { etiqueta: "natural" })).toBe(
      "/productos?categoria=barba&etiqueta=natural&orden=precio-asc",
    );
    expect(buildCatalogHref({ orden: "precio-asc" }, { orden: "destacados" })).toBe("/productos");
    expect(buildCatalogHref({ orden: "nombre" }, { orden: null })).toBe("/productos");
  });
});

describe("sortFromParam", () => {
  it("acepta los órdenes conocidos y cae en destacados con cualquier otra cosa", () => {
    expect(sortFromParam("precio-desc")).toBe("precio-desc");
    expect(sortFromParam("xyz")).toBe("destacados");
    expect(sortFromParam(undefined)).toBe("destacados");
  });
});

describe("sortProducts", () => {
  const caro = product("Zeta", [900, 1500]);
  const barato = product("Alfa", [300]);
  const medio = product("Medio", [500, 200], [1, 0]); // la de 200 está agotada: ordena por 500
  const agotado = product("Agotado", [100], [0]);
  const list = [caro, agotado, medio, barato];

  it("destacados devuelve la misma lista (ya viene ordenada de la base)", () => {
    expect(sortProducts(list, "destacados")).toBe(list);
  });

  it("por precio usa la variante más barata con stock y manda los agotados al final", () => {
    expect(sortProducts(list, "precio-asc").map((p) => p.name)).toEqual(["Alfa", "Medio", "Zeta", "Agotado"]);
    expect(sortProducts(list, "precio-desc").map((p) => p.name)).toEqual(["Zeta", "Medio", "Alfa", "Agotado"]);
    expect(list.map((p) => p.name)).toEqual(["Zeta", "Agotado", "Medio", "Alfa"]);
  });

  it("por nombre ordena alfabéticamente en español sin distinguir mayúsculas", () => {
    expect(sortProducts(list, "nombre").map((p) => p.name)).toEqual(["Agotado", "Alfa", "Medio", "Zeta"]);
  });
});

describe("firstParam", () => {
  it("toma el primer valor de un arreglo", () => {
    expect(firstParam(["a", "b"])).toBe("a");
  });
  it("devuelve el texto tal cual y undefined si falta", () => {
    expect(firstParam("a")).toBe("a");
    expect(firstParam(undefined)).toBeUndefined();
    expect(firstParam([])).toBeUndefined();
  });
});

describe("categoryFromSlug", () => {
  it("mapea el slug al valor de la categoría", () => {
    expect(categoryFromSlug("perfumes")?.value).toBe("perfume");
    expect(categoryFromSlug("barba")?.value).toBe("barba");
  });
  it("un slug desconocido o ausente no filtra", () => {
    expect(categoryFromSlug("xyz")).toBeUndefined();
    expect(categoryFromSlug(undefined)).toBeUndefined();
  });
});
