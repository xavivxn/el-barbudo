import { describe, expect, it } from "vitest";
import { cardPricing } from "@/lib/pricing";
import type { ProductDTO } from "@/lib/types";
import { buildInquiryMessage, buildOrderMessage, whatsappUrl } from "@/lib/whatsapp";

function product(overrides: Partial<ProductDTO>): ProductDTO {
  return {
    id: "p1",
    slug: "producto",
    name: "Producto",
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

describe("cardPricing", () => {
  it("una sola variante con stock: precio exacto y pedido sin etiqueta de variante", () => {
    const v = { id: "v1", label: "50 ml", price: 120000, stock: 2 };
    const result = cardPricing(product({ name: "Bálsamo", variants: [v] }));
    expect(result.soldOut).toBe(false);
    expect(result.label).toBe("₲ 120.000");
    expect(result.orderVariant).toEqual(v);
    expect(result.orderHref).toBe(
      whatsappUrl(buildOrderMessage([{ name: "Bálsamo", variantLabel: undefined, quantity: 1, unitPrice: 120000 }])),
    );
  });

  it("varias variantes: 'Desde' la más barata con stock, y pide esa", () => {
    const sinStock = { id: "v0", label: "30 ml", price: 100000, stock: 0 };
    const barata = { id: "v1", label: "50 ml", price: 450000, stock: 3 };
    const cara = { id: "v2", label: "100 ml", price: 650000, stock: 2 };
    const result = cardPricing(product({ name: "Noche", variants: [sinStock, barata, cara] }));
    expect(result.label).toBe("Desde ₲ 450.000");
    expect(result.orderVariant).toEqual(barata);
    expect(result.orderHref).toBe(
      whatsappUrl(buildOrderMessage([{ name: "Noche", variantLabel: "50 ml", quantity: 1, unitPrice: 450000 }])),
    );
  });

  it("agotado: precio de la más barata, sin variante de pedido y con consulta", () => {
    const result = cardPricing(
      product({
        name: "Oud",
        variants: [
          { id: "a", label: "50 ml", price: 1650000, stock: 0 },
          { id: "b", label: "100 ml", price: 2500000, stock: 0 },
        ],
      }),
    );
    expect(result.soldOut).toBe(true);
    expect(result.label).toBe("Desde ₲ 1.650.000");
    expect(result.orderVariant).toBeNull();
    expect(result.orderHref).toBe(whatsappUrl(buildInquiryMessage("Oud")));
  });

  it("sin variantes: sin precio y con consulta", () => {
    const result = cardPricing(product({ name: "Nada", variants: [] }));
    expect(result.label).toBeNull();
    expect(result.orderVariant).toBeNull();
    expect(result.orderHref).toBe(whatsappUrl(buildInquiryMessage("Nada")));
  });
});
