import { describe, expect, it } from "vitest";
import { clampQuantity, isSoldOut, minPrice } from "@/lib/stock";

describe("isSoldOut", () => {
  it("está agotado solo si ninguna variante tiene stock", () => {
    expect(isSoldOut([{ stock: 0 }, { stock: 0 }])).toBe(true);
    expect(isSoldOut([{ stock: 0 }, { stock: 3 }])).toBe(false);
    expect(isSoldOut([])).toBe(true);
  });
});

describe("clampQuantity", () => {
  it("recorta al stock, mínimo 1 y entero", () => {
    expect(clampQuantity(5, 3)).toBe(3);
    expect(clampQuantity(0, 3)).toBe(1);
    expect(clampQuantity(2, 0)).toBe(0);
    expect(clampQuantity(2.7, 10)).toBe(2);
  });
});

describe("minPrice", () => {
  it("devuelve el precio más bajo", () => {
    expect(minPrice([{ price: 450000 }, { price: 285000 }])).toBe(285000);
  });
});
