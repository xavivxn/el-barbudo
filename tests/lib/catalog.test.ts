import { describe, expect, it } from "vitest";
import { buildCatalogHref, categoryFromSlug, firstParam } from "@/lib/catalog";

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
