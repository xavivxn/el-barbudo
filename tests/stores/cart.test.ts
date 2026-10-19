import { beforeEach, describe, expect, it } from "vitest";
import type { VariantSnapshot } from "@/lib/types";
import { type CartItem, cartCount, cartTotal, toOrderLines, useCart } from "@/stores/cart";

const noir100 = {
  variantId: "v-noir-100",
  productId: "p-noir",
  slug: "noir-intense",
  name: "Noir Intense",
  variantLabel: "100 ml" as string | null,
  unitPrice: 285000,
  image: null,
  maxStock: 4,
};
const aceite = {
  variantId: "v-aceite",
  productId: "p-aceite",
  slug: "aceite-de-barba",
  name: "Aceite de barba",
  variantLabel: null,
  unitPrice: 95000,
  image: "/aceite.jpg" as string | null,
  maxStock: 10,
};
const soldOut = {
  variantId: "v-soldout",
  productId: "p-soldout",
  slug: "agotado",
  name: "Producto agotado",
  variantLabel: null,
  unitPrice: 50000,
  image: null,
  maxStock: 3,
};
const deleted = {
  variantId: "v-deleted",
  productId: "p-deleted",
  slug: "borrado",
  name: "Producto borrado",
  variantLabel: null,
  unitPrice: 70000,
  image: null,
  maxStock: 3,
};

const items = () => useCart.getState().items;

/** Snapshot del servidor para un ítem: por defecto, los mismos datos que ya tiene el carrito. */
function snapOf(item: Omit<CartItem, "quantity">, overrides: Partial<VariantSnapshot> = {}): VariantSnapshot {
  return {
    id: item.variantId,
    price: item.unitPrice,
    stock: item.maxStock,
    available: true,
    name: item.name,
    slug: item.slug,
    image: item.image,
    variantLabel: item.variantLabel,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  useCart.setState({ items: [], isOpen: false });
});

describe("add", () => {
  it("fusiona por variantId y recorta al stock", () => {
    useCart.getState().add(noir100, 2);
    useCart.getState().add(noir100, 5);
    expect(items()).toHaveLength(1);
    expect(items()[0].quantity).toBe(4);
  });

  it("no agrega una variante sin stock", () => {
    useCart.getState().add({ ...noir100, maxStock: 0 }, 1);
    expect(items()).toHaveLength(0);
  });
});

describe("selectores", () => {
  it("cuentan unidades y suman el total", () => {
    useCart.getState().add(noir100, 5);
    useCart.getState().add(aceite, 1);
    expect(cartCount(items())).toBe(5);
    expect(cartTotal(items())).toBe(4 * 285000 + 95000);
  });

  it("toOrderLines deja variantLabel null para productos de una variante", () => {
    useCart.getState().add(aceite, 2);
    expect(toOrderLines(items())).toEqual([
      { name: "Aceite de barba", variantLabel: null, quantity: 2, unitPrice: 95000 },
    ]);
  });
});

describe("setQuantity, remove, clear, open/close", () => {
  it("setQuantity <= 0 elimina el ítem", () => {
    useCart.getState().add(noir100, 1);
    useCart.getState().add(aceite, 1);
    useCart.getState().setQuantity(aceite.variantId, 0);
    expect(items()).toHaveLength(1);
  });

  it("setQuantity recorta al maxStock", () => {
    useCart.getState().add(noir100, 1);
    useCart.getState().setQuantity(noir100.variantId, 99);
    expect(items()[0].quantity).toBe(4);
  });

  it("remove y clear vacían", () => {
    useCart.getState().add(noir100, 1);
    useCart.getState().add(aceite, 1);
    useCart.getState().remove(noir100.variantId);
    expect(items().map((i) => i.variantId)).toEqual([aceite.variantId]);
    useCart.getState().clear();
    expect(items()).toEqual([]);
  });

  it("open y close alternan isOpen", () => {
    useCart.getState().open();
    expect(useCart.getState().isOpen).toBe(true);
    useCart.getState().close();
    expect(useCart.getState().isOpen).toBe(false);
  });
});

describe("reconcile", () => {
  it("actualiza precio y stock, recorta cantidades y quita agotados o borrados", () => {
    useCart.getState().add(noir100, 4);
    useCart.getState().add(soldOut, 1);
    useCart.getState().add(deleted, 1);

    const r = useCart.getState().reconcile([
      snapOf(noir100, { price: 300000, stock: 2 }),
      snapOf(soldOut, { price: 1, stock: 0 }),
    ]);

    expect(items().find((i) => i.variantId === noir100.variantId)).toMatchObject({
      unitPrice: 300000,
      quantity: 2,
      maxStock: 2,
    });
    expect(items()).toHaveLength(1);
    expect(r.adjusted).toEqual(["Noir Intense"]);
    expect(r.removed.sort()).toEqual(["Producto agotado", "Producto borrado"].sort());
    expect(toOrderLines(items())[0]).toEqual({
      name: "Noir Intense",
      variantLabel: "100 ml",
      quantity: 2,
      unitPrice: 300000,
    });
  });

  it("quita ítems de productos inactivos (available false)", () => {
    useCart.getState().add(aceite, 1);
    const r = useCart.getState().reconcile([
      snapOf(aceite, { stock: 5, available: false }),
    ]);
    expect(items()).toHaveLength(0);
    expect(r).toEqual({ removed: ["Aceite de barba"], adjusted: [] });
  });

  it("un cambio de precio solo actualiza, sin aviso", () => {
    useCart.getState().add(aceite, 2);
    const r = useCart.getState().reconcile([
      snapOf(aceite, { price: 99000 }),
    ]);
    expect(items()[0]).toMatchObject({ unitPrice: 99000, quantity: 2 });
    expect(r).toEqual({ removed: [], adjusted: [] });
  });

  it("subir el stock actualiza maxStock sin tocar la cantidad", () => {
    useCart.getState().add(noir100, 3);
    const r = useCart.getState().reconcile([
      snapOf(noir100, { stock: 9 }),
    ]);
    expect(items()[0]).toMatchObject({ quantity: 3, maxStock: 9 });
    expect(r.adjusted).toEqual([]);
  });
});

describe("reconcile actualiza los datos del producto", () => {
  it("nombre, dirección, foto y tamaño nuevos se copian sin aviso", () => {
    useCart.getState().add(noir100, 2);
    const r = useCart.getState().reconcile([
      snapOf(noir100, { name: "Noir Intense Elixir", slug: "noir-elixir", image: "/elixir.jpg", variantLabel: "100 ml EDP" }),
    ]);
    expect(items()[0]).toMatchObject({
      name: "Noir Intense Elixir",
      slug: "noir-elixir",
      image: "/elixir.jpg",
      variantLabel: "100 ml EDP",
      quantity: 2,
    });
    expect(r).toEqual({ removed: [], adjusted: [] });
    expect(toOrderLines(items())[0]).toMatchObject({ name: "Noir Intense Elixir", variantLabel: "100 ml EDP" });
  });

  it("si al producto le quitaron variantes y queda una sola, el tamaño deja de nombrarse", () => {
    useCart.getState().add(noir100, 1);
    useCart.getState().reconcile([snapOf(noir100, { variantLabel: null })]);
    expect(items()[0].variantLabel).toBeNull();
  });

  it("un producto renombrado y recortado avisa con el nombre nuevo", () => {
    useCart.getState().add(noir100, 4);
    const r = useCart.getState().reconcile([snapOf(noir100, { name: "Noir Elixir", stock: 1 })]);
    expect(r.adjusted).toEqual(["Noir Elixir"]);
  });
});

describe("persistencia", () => {
  it("guarda solo items bajo la clave elbarbudo-cart", () => {
    useCart.getState().add(noir100, 1);
    useCart.getState().open();
    const raw = localStorage.getItem("elbarbudo-cart");
    expect(raw).not.toBeNull();
    const state = JSON.parse(raw as string).state;
    expect(Object.keys(state)).toEqual(["items"]);
    expect(state.items).toHaveLength(1);
  });
});
