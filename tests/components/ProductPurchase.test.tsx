import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductPurchase } from "@/components/shop/ProductPurchase";
import type { ProductDTO } from "@/lib/types";
import { useCart } from "@/stores/cart";

afterEach(cleanup);

beforeEach(() => {
  useCart.setState({ items: [], isOpen: false });
});

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
    images: ["https://images.unsplash.com/photo-1?w=1200&q=75"],
    featured: false,
    active: true,
    variants: [],
    ...overrides,
  };
}

const perfumeTwoVariants = product({
  id: "bleu",
  slug: "bleu-de-chanel",
  name: "Bleu de Chanel",
  variants: [
    { id: "v50", label: "50 ml", price: 450000, stock: 3 },
    { id: "v100", label: "100 ml", price: 650000, stock: 0 },
  ],
});

const perfumeBothInStock = product({
  id: "eros",
  slug: "versace-eros",
  name: "Versace Eros",
  variants: [
    { id: "e50", label: "50 ml", price: 480000, stock: 5 },
    { id: "e100", label: "100 ml", price: 650000, stock: 2 },
  ],
});

const cheapestSoldOut = product({
  id: "sauvage",
  slug: "dior-sauvage",
  name: "Dior Sauvage",
  variants: [
    { id: "s60", label: "60 ml", price: 680000, stock: 0 },
    { id: "s100", label: "100 ml", price: 920000, stock: 4 },
  ],
});

const beardBalm = product({
  id: "balsamo",
  slug: "balsamo-de-barba",
  name: "Bálsamo de barba",
  category: "barba",
  images: [],
  variants: [{ id: "b100", label: "100 ml", price: 95000, stock: 8 }],
});

const soldOut = product({
  id: "oud",
  slug: "tom-ford-oud-wood",
  name: "Tom Ford Oud Wood",
  variants: [{ id: "o50", label: "50 ml", price: 1650000, stock: 0 }],
});

function orderHref() {
  return screen.getAllByRole("link", { name: /pedir ahora/i })[0].getAttribute("href") ?? "";
}

describe("ProductPurchase", () => {
  it("compra: variante sin stock deshabilitada, cantidad con tope, pedido y carrito", async () => {
    const user = userEvent.setup();
    render(<ProductPurchase product={perfumeTwoVariants} />);

    expect(screen.getByRole("radio", { name: /100 ml/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /50 ml/ })).toBeChecked();

    const increase = screen.getByRole("button", { name: "Aumentar cantidad" });
    await user.click(increase);
    await user.click(increase);
    await user.click(increase);
    expect(screen.getByLabelText("Cantidad")).toHaveTextContent("3");

    expect(orderHref()).toContain(encodeURIComponent("• 3 × Bleu de Chanel (50 ml) — ₲ 1.350.000"));
    const order = screen.getAllByRole("link", { name: /pedir ahora/i })[0];
    expect(order).toHaveAttribute("target", "_blank");

    await user.click(screen.getByRole("button", { name: /agregar al carrito/i }));
    expect(useCart.getState().items[0]).toMatchObject({
      quantity: 3,
      variantLabel: "50 ml",
      variantId: "v50",
      productId: "bleu",
      slug: "bleu-de-chanel",
      unitPrice: 450000,
      maxStock: 3,
      image: "https://images.unsplash.com/photo-1?w=1200&q=75",
    });
    expect(useCart.getState().isOpen).toBe(true);
  });

  it("muestra el total por la cantidad y el precio unitario debajo cuando hay más de una", async () => {
    const user = userEvent.setup();
    render(<ProductPurchase product={perfumeBothInStock} />);

    expect(screen.getByTestId("purchase-total")).toHaveTextContent("₲ 480.000");
    expect(screen.queryByText(/c\/u/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aumentar cantidad" }));
    expect(screen.getByTestId("purchase-total")).toHaveTextContent("₲ 960.000");
    expect(screen.getByText("₲ 480.000 c/u")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Disminuir cantidad" }));
    await user.click(screen.getByRole("button", { name: "Disminuir cantidad" }));
    expect(screen.getByLabelText("Cantidad")).toHaveTextContent("1");
  });

  it("al cambiar de variante recorta la cantidad al stock de la nueva", async () => {
    const user = userEvent.setup();
    render(<ProductPurchase product={perfumeBothInStock} />);

    const increase = screen.getByRole("button", { name: "Aumentar cantidad" });
    for (let i = 0; i < 4; i++) await user.click(increase);
    expect(screen.getByLabelText("Cantidad")).toHaveTextContent("5");

    await user.click(screen.getByRole("radio", { name: /100 ml/ }));
    expect(screen.getByLabelText("Cantidad")).toHaveTextContent("2");
    expect(orderHref()).toContain(encodeURIComponent("• 2 × Versace Eros (100 ml) — ₲ 1.300.000"));
  });

  it("si la variante más barata está agotada, selecciona por defecto la primera con stock", () => {
    render(<ProductPurchase product={cheapestSoldOut} />);

    expect(screen.getByRole("radio", { name: /60 ml/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /100 ml/ })).toBeChecked();
    expect(orderHref()).toContain(encodeURIComponent("• 1 × Dior Sauvage (100 ml) — ₲ 920.000"));
  });

  it("con una sola variante no muestra selector ni la repite en el mensaje ni en el carrito", async () => {
    const user = userEvent.setup();
    render(<ProductPurchase product={beardBalm} />);

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Tamaño" })).not.toBeInTheDocument();
    expect(orderHref()).toContain(encodeURIComponent("• 1 × Bálsamo de barba — ₲ 95.000"));

    await user.click(screen.getByRole("button", { name: /agregar al carrito/i }));
    expect(useCart.getState().items[0]).toMatchObject({
      quantity: 1,
      variantLabel: null,
      image: null,
      maxStock: 8,
    });
  });

  it("al agregar avisa 'Agregado al carrito' en una región viva y lo quita a los 2 s", () => {
    vi.useFakeTimers();
    try {
      render(<ProductPurchase product={beardBalm} />);
      expect(screen.queryByText("Agregado al carrito")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /agregar al carrito/i }));
      const notice = screen.getByText("Agregado al carrito");
      expect(notice.closest('[aria-live="polite"]')).not.toBeNull();
      expect(useCart.getState().isOpen).toBe(true);

      act(() => {
        vi.advanceTimersByTime(2100);
      });
      expect(screen.queryByText("Agregado al carrito")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("agotado: sin 'Pedir ahora' ni 'Agregar', sin cantidad, con 'Consultar disponibilidad'", () => {
    render(<ProductPurchase product={soldOut} />);

    expect(screen.queryByRole("link", { name: /pedir ahora/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /agregar al carrito/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aumentar cantidad" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    const inquiry = screen.getByRole("link", { name: /consultar disponibilidad/i });
    expect(inquiry).toHaveAttribute("target", "_blank");
    expect(decodeURIComponent(inquiry.getAttribute("href") ?? "")).toContain(
      "¿tienen disponible Tom Ford Oud Wood?",
    );
  });
});
