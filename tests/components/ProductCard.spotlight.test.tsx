import { cleanup, createEvent, fireEvent, render } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductCard } from "@/components/shop/ProductCard";
import type { ProductDTO } from "@/lib/types";

type MockImageProps = ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; preload?: boolean };

vi.mock("next/image", () => ({
  default: (props: MockImageProps) => {
    const img = { ...props };
    delete img.fill;
    delete img.preload;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...img} alt={img.alt ?? ""} />;
  },
}));

afterEach(cleanup);

const product: ProductDTO = {
  id: "p1",
  slug: "noche-de-cuero",
  name: "Noche de Cuero",
  subtitle: "Eau de parfum",
  category: "perfume",
  description: "",
  notes: null,
  benefits: [],
  tags: [],
  images: ["https://images.unsplash.com/photo-1?w=1200&q=75"],
  featured: true,
  active: true,
  variants: [{ id: "v1", label: "50 ml", price: 450000, stock: 3 }],
};

/** jsdom no implementa PointerEvent: se arma un evento con los campos que lee el hook. */
function pointerMove(el: Element, pointerType: string, clientX: number, clientY: number) {
  const event = createEvent.pointerMove(el, { clientX, clientY });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  fireEvent(el, event);
}

function setup() {
  const { container } = render(<ProductCard product={product} />);
  const article = container.querySelector("article") as HTMLElement;
  article.getBoundingClientRect = () =>
    ({ left: 100, top: 40, width: 200, height: 300, right: 300, bottom: 340, x: 100, y: 40 }) as DOMRect;
  return article;
}

describe("ProductCard: luz que sigue al mouse", () => {
  it("con el mouse escribe --mx/--my relativos a la tarjeta", () => {
    const article = setup();
    pointerMove(article, "mouse", 130, 90);

    expect(article.style.getPropertyValue("--mx")).toBe("30px");
    expect(article.style.getPropertyValue("--my")).toBe("50px");
  });

  it("con touch o lápiz no toca las variables", () => {
    const article = setup();
    pointerMove(article, "touch", 130, 90);
    pointerMove(article, "pen", 150, 100);

    expect(article.style.getPropertyValue("--mx")).toBe("");
    expect(article.style.getPropertyValue("--my")).toBe("");
  });
});
