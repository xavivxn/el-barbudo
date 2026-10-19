import { describe, expect, it } from "vitest";
import { fieldErrors, parseProductForm, productSchema, slugify } from "@/lib/validation";

type Variant = { id?: string; label: string; price: string; stock: string };

function form(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "Bleu de Chanel",
    slug: "bleu-de-chanel",
    subtitle: "Eau de parfum",
    category: "perfume",
    description: "Aromático amaderado.",
    notes: { top: "Pomelo", heart: "Jengibre", base: "Cedro" },
    benefits: "",
    tags: "",
    images: "",
    featured: "",
    active: "on",
    variants: [{ label: "100 ml", price: "285.000", stock: "4" }] satisfies Variant[],
    ...over,
  };
}

function parseOk(over: Record<string, unknown> = {}) {
  const result = productSchema.safeParse(form(over));
  if (!result.success) throw new Error(JSON.stringify(fieldErrors(result)));
  return result.data;
}

describe("slugify", () => {
  it("pasa a minúsculas con guiones", () => {
    expect(slugify("Bleu de Chanel Eau de Parfum")).toBe("bleu-de-chanel-eau-de-parfum");
  });

  it("quita tildes y símbolos", () => {
    expect(slugify("Ácido & Cítrico")).toBe("acido-citrico");
  });

  it("no deja guiones al borde ni repetidos", () => {
    expect(slugify("  --Aceite   (barba)-- ")).toBe("aceite-barba");
  });

  it("conserva la ñ como n", () => {
    expect(slugify("Peñón")).toBe("penon");
  });

  it("devuelve vacío si no queda nada", () => {
    expect(slugify("¡¿?!")).toBe("");
  });
});

describe("productSchema", () => {
  it("acepta un producto válido y normaliza precio, stock, etiquetas y fotos", () => {
    const ok = productSchema.safeParse(
      form({
        variants: [{ label: "100 ml", price: "285.000", stock: "4" }],
        tags: "amaderado, noche",
        images: "https://x.com/a.jpg\nhttps://x.com/b.jpg",
      }),
    );
    expect(ok.success).toBe(true);
    if (!ok.success) return;
    expect(ok.data.variants[0]).toMatchObject({ price: 285000, stock: 4 });
    expect(ok.data.tags).toEqual(["amaderado", "noche"]);
    expect(ok.data.images).toEqual(["https://x.com/a.jpg", "https://x.com/b.jpg"]);
  });

  it.each([
    ["285.000", 285000],
    ["285000", 285000],
    [" 285 000 ", 285000],
  ])("el precio %j se guarda como %d", (typed, saved) => {
    const data = parseOk({ variants: [{ label: "x", price: typed, stock: "1" }] });
    expect(data.variants[0].price).toBe(saved);
  });

  it("muestra los errores junto a cada campo", () => {
    const bad = productSchema.safeParse(
      form({
        name: "",
        variants: [{ label: "", price: "-5", stock: "1,5" }],
        images: "http://inseguro.com/a.jpg",
      }),
    );
    expect(bad.success).toBe(false);
    expect(fieldErrors(bad)).toMatchObject({
      name: "Escribí el nombre del producto.",
      "variants.0.label": "Escribí el tamaño o presentación.",
      "variants.0.price": "Ingresá un precio en guaraníes, sin decimales.",
      "variants.0.stock": "Ingresá un número entero, 0 o más.",
      images: "Cada foto tiene que ser una URL que empiece con https://",
    });
  });

  it.each(["12,5", "12.5", "", "0", "abc"])("rechaza el precio %j", (price) => {
    const bad = productSchema.safeParse(form({ variants: [{ label: "x", price, stock: "1" }] }));
    expect(fieldErrors(bad)["variants.0.price"]).toBe(
      "Ingresá un precio en guaraníes, sin decimales.",
    );
  });

  it("acepta stock 0 y rechaza vacío o negativo", () => {
    expect(parseOk({ variants: [{ label: "x", price: "100", stock: "0" }] }).variants[0].stock).toBe(0);
    for (const stock of ["", "-1"]) {
      const bad = productSchema.safeParse(form({ variants: [{ label: "x", price: "100", stock }] }));
      expect(fieldErrors(bad)["variants.0.stock"]).toBe("Ingresá un número entero, 0 o más.");
    }
  });

  it("exige al menos una variante", () => {
    const bad = productSchema.safeParse(form({ variants: [] }));
    expect(bad.success).toBe(false);
    expect(fieldErrors(bad).variants).toBe("Agregá al menos una variante.");
  });

  it("marca el índice correcto cuando falla la segunda variante", () => {
    const bad = productSchema.safeParse(
      form({
        variants: [
          { label: "50 ml", price: "100", stock: "1" },
          { label: "100 ml", price: "x", stock: "1" },
        ],
      }),
    );
    const errors = fieldErrors(bad);
    expect(errors["variants.1.price"]).toBeDefined();
    expect(errors["variants.0.price"]).toBeUndefined();
  });

  it("conserva el id de las variantes existentes", () => {
    const data = parseOk({ variants: [{ id: "v1", label: "x", price: "100", stock: "1" }, { id: "", label: "y", price: "200", stock: "2" }] });
    expect(data.variants[0].id).toBe("v1");
    expect(data.variants[1].id).toBeUndefined();
  });

  it("valida la dirección (slug)", () => {
    expect(fieldErrors(productSchema.safeParse(form({ slug: "" }))).slug).toBeDefined();
    expect(fieldErrors(productSchema.safeParse(form({ slug: "Con Espacios" }))).slug).toBe(
      "Usá solo letras minúsculas, números y guiones.",
    );
    expect(parseOk({ slug: "aceite-barba-2" }).slug).toBe("aceite-barba-2");
  });

  it("requiere subtítulo y descripción", () => {
    const errors = fieldErrors(productSchema.safeParse(form({ subtitle: " ", description: "" })));
    expect(errors.subtitle).toBe("Escribí un subtítulo corto.");
    expect(errors.description).toBe("Escribí la descripción del producto.");
  });

  it("rechaza categorías desconocidas", () => {
    expect(fieldErrors(productSchema.safeParse(form({ category: "ropa" }))).category).toBe(
      "Elegí una categoría.",
    );
  });

  it("etiquetas: minúsculas, sin vacías ni repetidas", () => {
    expect(parseOk({ tags: " Amaderado, noche,, AMADERADO ,  " }).tags).toEqual(["amaderado", "noche"]);
  });

  it("fotos: una por línea, ignora líneas vacías y acepta saltos de Windows", () => {
    expect(parseOk({ images: "https://x.com/a.jpg\r\n\r\n  https://x.com/b.jpg  \n" }).images).toEqual([
      "https://x.com/a.jpg",
      "https://x.com/b.jpg",
    ]);
  });

  it.each(["x.com/a.jpg", "https://", "javascript:alert(1)", "ftp://x.com/a.jpg"])(
    "fotos: rechaza %j",
    (images) => {
      expect(fieldErrors(productSchema.safeParse(form({ images }))).images).toBe(
        "Cada foto tiene que ser una URL que empiece con https://",
      );
    },
  );

  describe("notas olfativas", () => {
    it("las tres completas se guardan", () => {
      expect(parseOk().notes).toEqual({ top: "Pomelo", heart: "Jengibre", base: "Cedro" });
    });

    it("las tres vacías son null", () => {
      expect(parseOk({ notes: { top: "", heart: " ", base: "" } }).notes).toBeNull();
    });

    it("algunas sí y otras no es un error", () => {
      const bad = productSchema.safeParse(form({ notes: { top: "Pomelo", heart: "", base: "" } }));
      expect(fieldErrors(bad).notes).toBe("Completá las tres notas o dejalas todas vacías.");
    });

    it("el error de notas aparece junto con los de otros campos", () => {
      const bad = productSchema.safeParse(
        form({ name: "", notes: { top: "Pomelo", heart: "", base: "" } }),
      );
      expect(Object.keys(fieldErrors(bad)).sort()).toEqual(["name", "notes"]);
    });

    it("en productos que no son perfume se ignoran, aunque vengan en el envío", () => {
      const data = parseOk({ category: "barba", benefits: "Hidrata", notes: { top: "a", heart: "", base: "" } });
      expect(data.notes).toBeNull();
    });
  });

  describe("beneficios", () => {
    it("uno por línea, sin vacíos", () => {
      expect(parseOk({ category: "barba", benefits: "Hidrata\r\n\nSuaviza  \n" }).benefits).toEqual([
        "Hidrata",
        "Suaviza",
      ]);
    });

    it("en perfumes se ignoran", () => {
      expect(parseOk({ category: "perfume", benefits: "Hidrata" }).benefits).toEqual([]);
    });
  });

  it("interruptores: on / true son verdadero, el resto falso", () => {
    expect(parseOk({ featured: "on", active: "" })).toMatchObject({ featured: true, active: false });
    expect(parseOk({ featured: true, active: false })).toMatchObject({ featured: true, active: false });
  });
});

describe("parseProductForm", () => {
  function formData(entries: [string, string][]): FormData {
    const data = new FormData();
    for (const [key, value] of entries) data.append(key, value);
    return data;
  }

  it("arma variantes y notas a partir de nombres planos", () => {
    const parsed = parseProductForm(
      formData([
        ["name", "Bleu"],
        ["notes.top", "Pomelo"],
        ["notes.heart", "Jengibre"],
        ["notes.base", "Cedro"],
        ["variants.0.id", "v1"],
        ["variants.0.label", "50 ml"],
        ["variants.0.price", "100.000"],
        ["variants.0.stock", "2"],
        ["variants.1.id", ""],
        ["variants.1.label", "100 ml"],
        ["variants.1.price", "180.000"],
        ["variants.1.stock", "0"],
      ]),
    );
    expect(parsed.name).toBe("Bleu");
    expect(parsed.notes).toEqual({ top: "Pomelo", heart: "Jengibre", base: "Cedro" });
    expect(parsed.variants).toEqual([
      { id: "v1", label: "50 ml", price: "100.000", stock: "2" },
      { id: "", label: "100 ml", price: "180.000", stock: "0" },
    ]);
  });

  it("ordena las variantes por índice numérico (10 después de 2)", () => {
    const entries: [string, string][] = [];
    for (const i of [10, 2, 0]) entries.push([`variants.${i}.label`, `v${i}`]);
    const parsed = parseProductForm(formData(entries));
    expect((parsed.variants as { label: string }[]).map((v) => v.label)).toEqual(["v0", "v2", "v10"]);
  });

  it("sin variantes devuelve una lista vacía y los campos ausentes quedan como texto vacío", () => {
    const parsed = parseProductForm(formData([]));
    expect(parsed.variants).toEqual([]);
    expect(parsed.name).toBe("");
    expect(parsed.notes).toEqual({ top: "", heart: "", base: "" });
  });

  it("los interruptores marcados llegan como true", () => {
    const parsed = parseProductForm(formData([["featured", "on"]]));
    expect(parsed.featured).toBe(true);
    expect(parsed.active).toBe(false);
  });

  it("ignora campos desconocidos y archivos", () => {
    const data = formData([["variants.0.hack", "x"], ["__proto__.x", "y"], ["variants.x.label", "z"]]);
    data.append("name", new File(["a"], "a.txt"));
    const parsed = parseProductForm(data);
    expect(parsed.name).toBe("");
    expect(parsed.variants).toEqual([]);
  });

  it("de punta a punta: lo que arma el formulario pasa por el esquema", () => {
    const parsed = parseProductForm(
      formData([
        ["name", "Aceite"],
        ["slug", "aceite"],
        ["subtitle", "Barba"],
        ["category", "barba"],
        ["description", "Suaviza."],
        ["benefits", "Hidrata\nSuaviza"],
        ["active", "on"],
        ["variants.0.label", "30 ml"],
        ["variants.0.price", " 85 000 "],
        ["variants.0.stock", "3"],
      ]),
    );
    const result = productSchema.safeParse(parsed);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.variants[0].price).toBe(85000);
      expect(result.data.benefits).toEqual(["Hidrata", "Suaviza"]);
      expect(result.data.active).toBe(true);
    }
  });
});
