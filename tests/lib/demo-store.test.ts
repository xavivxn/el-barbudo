import { afterEach, describe, expect, it, vi } from "vitest";
import { products as catalog, services as catalogServices } from "@/lib/catalog-data";
import {
  getProductById,
  getProductBySlug,
  getVariantSnapshots,
  listProducts,
  listServices,
  listTags,
} from "@/lib/demo-store";

const FEATURED = ["bleu-de-chanel", "dior-sauvage", "creed-aventus", "aceite-de-barba"];

describe("demo-store: productos", () => {
  it("lista los 12 del catálogo, activos, con los 4 destacados primero y el resto en el orden del seed", async () => {
    const all = await listProducts();
    expect(all).toHaveLength(12);
    expect(all.every((p) => p.active)).toBe(true);
    const slugs = all.map((p) => p.slug);
    expect(slugs.slice(0, 4)).toEqual(FEATURED);
    expect(slugs.slice(4)).toEqual(catalog.map((p) => p.slug).filter((s) => !FEATURED.includes(s)));
  });

  it("usa ids estables y únicos: demo-<slug> y demo-<slug>-<n>, con las variantes por precio", async () => {
    const bleu = await getProductBySlug("bleu-de-chanel");
    expect(bleu).toMatchObject({ id: "demo-bleu-de-chanel", category: "perfume", featured: true });
    expect(bleu?.variants).toEqual([
      { id: "demo-bleu-de-chanel-0", label: "50 ml", price: 750000, stock: 5 },
      { id: "demo-bleu-de-chanel-1", label: "100 ml", price: 1050000, stock: 3 },
    ]);
    expect(bleu?.notes).toEqual({
      top: "Pomelo, limón, menta, pimienta rosa",
      heart: "Jengibre, nuez moscada, jazmín",
      base: "Incienso, cedro, sándalo, pachulí",
    });

    const all = await listProducts();
    const ids = all.flatMap((p) => [p.id, ...p.variants.map((v) => v.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of all) {
      const prices = p.variants.map((v) => v.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    }
  });

  it("los productos de barba y cabello traen beneficios y no notas", async () => {
    const aceite = await getProductBySlug("aceite-de-barba");
    expect(aceite?.notes).toBeNull();
    expect(aceite?.benefits).toHaveLength(3);
  });

  it("filtra por categoría, etiqueta y destacados como la base", async () => {
    const barba = await listProducts({ category: "barba" });
    expect(barba.map((p) => p.slug)).toEqual(["aceite-de-barba", "balsamo-de-barba", "shampoo-de-barba"]);

    const noche = await listProducts({ tag: "noche" });
    expect(noche.map((p) => p.slug)).toEqual(["creed-aventus", "tom-ford-oud-wood", "versace-eros"]);

    expect((await listProducts({ featuredOnly: true })).map((p) => p.slug)).toEqual(FEATURED);
    expect(await listProducts({ category: "cabello", tag: "noche" })).toEqual([]);
    expect(await listProducts({ includeInactive: true })).toHaveLength(12);
  });

  it("getProductBySlug devuelve null si el slug no existe", async () => {
    expect(await getProductBySlug("no-existe")).toBeNull();
  });

  it("getProductById encuentra por id y devuelve null si no existe", async () => {
    expect((await getProductById("demo-ysl-y"))?.name).toBe("Yves Saint Laurent Y");
    expect(await getProductById("ysl-y")).toBeNull();
  });

  it("listTags devuelve las etiquetas sin repetir, en orden alfabético", async () => {
    const tags = await listTags();
    expect(tags).toEqual([...new Set(catalog.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b, "es")));
    expect(tags).toContain("día");
  });
});

describe("demo-store: getVariantSnapshots", () => {
  it("devuelve el estado de las variantes pedidas y omite los ids desconocidos", async () => {
    const out = await getVariantSnapshots(["demo-bleu-de-chanel-1", "no-existe", "demo-aceite-de-barba-0"]);
    expect(out).toHaveLength(2);
    expect(out).toContainEqual({
      id: "demo-bleu-de-chanel-1",
      price: 1050000,
      stock: 3,
      available: true,
      name: "Bleu de Chanel",
      slug: "bleu-de-chanel",
      image: catalog[0].images[0],
      variantLabel: "100 ml",
    });
    // Una sola variante: el tamaño no se nombra.
    expect(out).toContainEqual(expect.objectContaining({ id: "demo-aceite-de-barba-0", variantLabel: null }));
  });

  it("sin foto la imagen es null; con una lista vacía devuelve vacío", async () => {
    const [balsamo] = await getVariantSnapshots(["demo-balsamo-de-barba-0"]);
    expect(balsamo.image).toBeNull();
    expect(await getVariantSnapshots([])).toEqual([]);
  });
});

describe("demo-store: servicios", () => {
  it("lista los 6 servicios en el orden del catálogo", async () => {
    const out = await listServices();
    expect(out).toHaveLength(6);
    expect(out.map((s) => s.name)).toEqual(catalogServices.map((s) => s.name));
    expect(out.map((s) => s.order)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(new Set(out.map((s) => s.id)).size).toBe(6);
  });
});

describe("products.ts y services.ts en modo demo", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/db");
    vi.resetModules();
  });

  /** Cargar `@/lib/db` falla: si alguna lectura lo importara, la prueba lo vería. */
  async function loadReaders(demo: "true" | "false") {
    vi.resetModules();
    vi.stubEnv("DEMO_MODE", demo);
    vi.doMock("@/lib/db", () => {
      throw new Error("db imported");
    });
    return { products: await import("@/lib/products"), services: await import("@/lib/services") };
  }

  it("ninguna lectura importa @/lib/db y todas responden con el catálogo", async () => {
    const { products, services } = await loadReaders("true");
    expect(await products.listProducts()).toHaveLength(12);
    expect(await products.listProducts({ category: "cabello" })).toHaveLength(2);
    expect((await products.getProductBySlug("dior-sauvage"))?.id).toBe("demo-dior-sauvage");
    expect(await products.getProductBySlug("no-existe")).toBeNull();
    expect((await products.getProductById("demo-dior-sauvage"))?.slug).toBe("dior-sauvage");
    expect(await products.listTags()).toContain("fresco");
    expect(await products.getVariantSnapshots(["demo-dior-sauvage-1", "x"])).toHaveLength(1);
    expect(await services.listServices()).toHaveLength(6);
  });

  it("con DEMO_MODE=false las mismas lecturas sí van a la base", async () => {
    // Control de la prueba de arriba: el mock de @/lib/db de verdad intercepta el import diferido.
    const { products, services } = await loadReaders("false");
    // Vitest envuelve el error de la fábrica del mock; el original queda en `cause`.
    await expect(products.listProducts()).rejects.toHaveProperty("cause.message", "db imported");
    await expect(services.listServices()).rejects.toHaveProperty("cause.message", "db imported");
  });
});
