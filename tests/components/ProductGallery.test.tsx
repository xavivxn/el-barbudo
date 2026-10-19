import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductGallery } from "@/components/shop/ProductGallery";

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

const photo = (n: number) => `https://images.unsplash.com/photo-${n}?w=1200&q=75`;

describe("ProductGallery", () => {
  it("sin fotos muestra el placeholder 'Sin foto'", () => {
    render(<ProductGallery images={[]} name="Pomada mate" />);
    expect(screen.getByRole("img", { name: "Sin foto" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("con una foto no muestra miniaturas", () => {
    render(<ProductGallery images={[photo(1)]} name="Bleu de Chanel" />);
    expect(screen.getByRole("img", { name: "Bleu de Chanel" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("con varias fotos, las miniaturas marcan la elegida con aria-current", async () => {
    const user = userEvent.setup();
    // jsdom no implementa scrollTo ni matchMedia.
    Element.prototype.scrollTo = vi.fn();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as typeof window.matchMedia;

    render(<ProductGallery images={[photo(1), photo(2), photo(3)]} name="Creed Aventus" />);

    expect(screen.getByRole("img", { name: "Creed Aventus, foto 2 de 3" })).toBeInTheDocument();
    const first = screen.getByRole("button", { name: "Ver imagen 1" });
    const second = screen.getByRole("button", { name: "Ver imagen 2" });
    expect(first).toHaveAttribute("aria-current", "true");
    expect(second).not.toHaveAttribute("aria-current");

    await user.click(second);
    expect(second).toHaveAttribute("aria-current", "true");
    expect(first).not.toHaveAttribute("aria-current");
  });
});
