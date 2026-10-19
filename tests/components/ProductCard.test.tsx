import { cleanup, render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductCard } from "@/components/shop/ProductCard";
import type { ProductDTO } from "@/lib/types";

type MockImageProps = ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; preload?: boolean };

vi.mock("next/image", () => ({
  default: (props: MockImageProps) => {
    // `fill` y `preload` son props de next/image, no atributos de <img>.
    const img = { ...props };
    delete img.fill;
    delete img.preload;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...img} alt={img.alt ?? ""} />;
  },
}));

afterEach(cleanup);

function product(overrides: Partial<ProductDTO>): ProductDTO {
  return {
    id: "p1",
    slug: "producto",
    name: "Producto",
    subtitle: "Subtítulo",
    category: "perfume",
    description: "",
    notes: null,
    benefits: [],
    tags: [],
    images: ["https://images.unsplash.com/photo-1?w=1200&q=75"],
    featured: true,
    active: true,
    variants: [],
    ...overrides,
  };
}

const perfumeTwoVariants = product({
  slug: "noche-de-cuero",
  name: "Noche de Cuero",
  subtitle: "Eau de parfum",
  variants: [
    { id: "v1", label: "50 ml", price: 450000, stock: 3 },
    { id: "v2", label: "100 ml", price: 650000, stock: 2 },
  ],
});

const soldOutProduct = product({
  slug: "oud-reserva",
  name: "Oud Reserva",
  images: [],
  variants: [{ id: "v3", label: "50 ml", price: 1650000, stock: 0 }],
});

const cheapestSoldOut = product({
  slug: "ambar-nocturno",
  name: "Ámbar Nocturno",
  variants: [
    { id: "v5", label: "50 ml", price: 450000, stock: 0 },
    { id: "v6", label: "100 ml", price: 650000, stock: 2 },
  ],
});

const beardOil = product({
  slug: "aceite-de-barba",
  name: "Aceite de barba",
  category: "barba",
  variants: [{ id: "v4", label: "30 ml", price: 85000, stock: 12 }],
});

function decodedHref(link: HTMLElement) {
  return decodeURIComponent(link.getAttribute("href") ?? "");
}

describe("ProductCard", () => {
  it("muestra 'Desde' con el precio más bajo y pide la variante más barata por WhatsApp", () => {
    render(<ProductCard product={perfumeTwoVariants} />);

    expect(screen.getByText("Desde ₲ 450.000")).toBeInTheDocument();
    const order = screen.getByRole("link", { name: /pedir .* por whatsapp/i });
    expect(order).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(order).toHaveAttribute("target", "_blank");
    expect(decodedHref(order)).toContain("• 1 × Noche de Cuero (50 ml) — ₲ 450.000");
  });

  it("el nombre es un h3 por defecto y un h2 si se pide (grilla justo bajo el h1)", () => {
    const { rerender } = render(<ProductCard product={perfumeTwoVariants} />);
    expect(screen.getByRole("heading", { level: 3, name: "Noche de Cuero" })).toBeInTheDocument();

    rerender(<ProductCard product={perfumeTwoVariants} headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2, name: "Noche de Cuero" })).toBeInTheDocument();
  });

  it("enlaza la imagen y el nombre a la ficha del producto", () => {
    const { container } = render(<ProductCard product={perfumeTwoVariants} />);

    expect(screen.getByRole("link", { name: "Noche de Cuero" })).toHaveAttribute(
      "href",
      "/productos/noche-de-cuero",
    );
    const productLinks = container.querySelectorAll('a[href="/productos/noche-de-cuero"]');
    expect(productLinks).toHaveLength(2);
  });

  it("con una sola variante muestra el precio exacto y no repite la variante en el mensaje", () => {
    render(<ProductCard product={beardOil} />);

    expect(screen.getByText("₲ 85.000")).toBeInTheDocument();
    expect(screen.queryByText(/desde/i)).not.toBeInTheDocument();
    const order = screen.getByRole("link", { name: /pedir aceite de barba por whatsapp/i });
    expect(decodedHref(order)).toContain("• 1 × Aceite de barba — ₲ 85.000");
  });

  it("si la variante más barata está agotada, muestra y pide la más barata con stock", () => {
    render(<ProductCard product={cheapestSoldOut} />);

    expect(screen.getByText("Desde ₲ 650.000")).toBeInTheDocument();
    expect(screen.queryByText(/450\.000/)).not.toBeInTheDocument();
    const href = screen
      .getByRole("link", { name: /pedir ámbar nocturno por whatsapp/i })
      .getAttribute("href");
    expect(href).toContain(encodeURIComponent("(100 ml)"));
    expect(href).toContain(encodeURIComponent("₲ 650.000"));
    expect(href).not.toContain(encodeURIComponent("(50 ml)"));
  });

  it("agotado: etiqueta, sin botón de pedido y con consulta por WhatsApp", () => {
    render(<ProductCard product={soldOutProduct} />);

    expect(screen.getByText("Agotado")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /pedir/i })).not.toBeInTheDocument();
    const inquiry = screen.getByRole("link", { name: /consultar/i });
    expect(inquiry.getAttribute("href")).toContain(encodeURIComponent("¿tienen disponible"));
    expect(decodedHref(inquiry)).toContain("¿tienen disponible Oud Reserva?");
    // Sin fotos (`images: []`): placeholder neutro dentro del enlace de imagen (aria-hidden).
    expect(screen.getByRole("img", { name: "Sin foto", hidden: true })).toBeInTheDocument();
  });
});
