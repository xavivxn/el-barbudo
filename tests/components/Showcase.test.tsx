import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Showcase } from "@/components/shop/home/Showcase";
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

function product(overrides: Partial<ProductDTO>): ProductDTO {
  return {
    id: "p",
    slug: "producto",
    name: "Producto",
    subtitle: "",
    category: "perfume",
    description: "",
    notes: null,
    benefits: [],
    tags: [],
    images: ["https://images.unsplash.com/photo-1?w=1200&q=75"],
    featured: true,
    active: true,
    variants: [{ id: "v", label: "50 ml", price: 100000, stock: 3 }],
    ...overrides,
  };
}

const p1 = product({
  id: "p1",
  slug: "noche-de-cuero",
  name: "Noche de Cuero",
  notes: { top: "Pomelo, limón, menta", heart: "Lavanda", base: "Cuero" },
  tags: ["amaderado", "fresco", "día"],
  variants: [
    { id: "v1", label: "50 ml", price: 450000, stock: 3 },
    { id: "v2", label: "100 ml", price: 650000, stock: 2 },
  ],
});
const p2 = product({ id: "p2", slug: "bleu", name: "Bleu", tags: ["fresco"] });
const p3 = product({
  id: "p3",
  slug: "aceite-de-barba",
  name: "Aceite de barba",
  category: "barba",
  description: "Suaviza y da brillo.",
  tags: ["natural"],
});
const soldOutNoPhoto = product({
  id: "p4",
  slug: "oud-reserva",
  name: "Oud Reserva",
  images: [],
  variants: [{ id: "v4", label: "50 ml", price: 1650000, stock: 0 }],
});

const originalMatchMedia = window.matchMedia;
const originalScrollTo = Element.prototype.scrollTo;
const scrollTo = vi.fn();

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  // jsdom no implementa scrollTo ni matchMedia.
  scrollTo.mockClear();
  Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
  mockReducedMotion(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.matchMedia = originalMatchMedia;
  Element.prototype.scrollTo = originalScrollTo;
});

/**
 * Ruling R1 + `shouldAdvanceTime`: el `asyncWrapper` de Testing Library espera un `setTimeout(0)` real
 * que con relojes falsos de Vitest nunca llega, y user-event se cuelga sin esto.
 */
function useFakeTimersWithUserEvent() {
  vi.useFakeTimers({ shouldAdvanceTime: true });
}

const activeSlide = () => screen.getAllByRole("group").find((slide) => !slide.hasAttribute("inert"));

describe("Showcase", () => {
  it("es un carrusel con diapositivas; solo la activa es interactiva y se navega con flechas y teclado", async () => {
    const user = userEvent.setup();
    render(<Showcase products={[p1, p2, p3]} />);

    const region = screen.getByRole("region", { name: /destacados/i });
    expect(region).toHaveAttribute("aria-roledescription", "carrusel");
    const slides = within(region).getAllByRole("group");
    expect(slides).toHaveLength(3);
    expect(slides[0]).toHaveAttribute("aria-roledescription", "diapositiva");
    expect(screen.getByRole("group", { name: "1 de 3" })).not.toHaveAttribute("inert");
    expect(screen.getByRole("group", { name: "2 de 3" })).toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Ir al destacado 1" })).toHaveAttribute("aria-current", "true");

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("button", { name: "Ir al destacado 2" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Ir al destacado 1" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("group", { name: "2 de 3" })).not.toHaveAttribute("inert");
    expect(screen.getByRole("group", { name: "1 de 3" })).toHaveAttribute("inert");
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: "smooth" }));

    // El foco quedó en "Siguiente", dentro de la región.
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "Ir al destacado 1" })).toHaveAttribute("aria-current", "true");
    // Alt + flecha es del navegador (atrás/adelante): no mueve la vitrina.
    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(screen.getByRole("button", { name: "Ir al destacado 1" })).toHaveAttribute("aria-current", "true");

    // Circular: desde la primera, "Anterior" va a la última.
    await user.click(screen.getByRole("button", { name: "Anterior" }));
    expect(screen.getByRole("button", { name: "Ir al destacado 3" })).toHaveAttribute("aria-current", "true");

    await user.click(screen.getByRole("button", { name: "Ir al destacado 2" }));
    expect(activeSlide()).toHaveAccessibleName("2 de 3");
  });

  it("muestra nombre, hasta 2 etiquetas, la salida, el precio y los pedidos de la diapositiva", () => {
    render(<Showcase products={[p1, p2]} />);

    const slide = screen.getByRole("group", { name: "1 de 2" });
    expect(within(slide).getByRole("heading", { level: 2, name: "Noche de Cuero" })).toBeInTheDocument();
    expect(within(slide).getByText("amaderado")).toBeInTheDocument();
    expect(within(slide).getByText("fresco")).toBeInTheDocument();
    expect(within(slide).queryByText("día")).not.toBeInTheDocument();
    expect(within(slide).getByText("Salida: Pomelo, limón, menta")).toBeInTheDocument();
    expect(within(slide).getByText("Desde ₲ 450.000")).toBeInTheDocument();

    const order = within(slide).getByRole("link", { name: /pedir ahora/i });
    expect(order).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(order).toHaveAttribute("target", "_blank");
    expect(order).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(slide).getByRole("link", { name: "Ver producto" })).toHaveAttribute(
      "href",
      "/productos/noche-de-cuero",
    );
  });

  it("sin notas usa la descripción como línea", () => {
    render(<Showcase products={[p3]} />);
    expect(screen.getByText("Suaviza y da brillo.")).toBeInTheDocument();
  });

  it("agotado y sin fotos: consulta disponibilidad, placeholder y sin controles con un solo producto", () => {
    render(<Showcase products={[soldOutNoPhoto]} />);

    expect(screen.getByRole("link", { name: /consultar disponibilidad/i })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me"),
    );
    expect(screen.queryByRole("link", { name: /pedir ahora/i })).not.toBeInTheDocument();
    expect(screen.getByText("Agotado")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sin foto" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("sin productos no renderiza nada", () => {
    const { container } = render(<Showcase products={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("al deslizar con el dedo sincroniza la diapositiva activa", () => {
    vi.useFakeTimers();
    render(<Showcase products={[p1, p2, p3]} />);

    const track = screen.getByRole("group", { name: "1 de 3" }).parentElement as HTMLElement;
    Object.defineProperty(track, "clientWidth", { configurable: true, value: 300 });
    track.scrollLeft = 600;
    fireEvent.scroll(track);
    act(() => vi.advanceTimersByTime(200));

    expect(screen.getByRole("button", { name: "Ir al destacado 3" })).toHaveAttribute("aria-current", "true");
  });

  describe("auto-avance", () => {
    it("avanza cada 6 s, se pausa con hover y con el botón Pausar/Reanudar", async () => {
      useFakeTimersWithUserEvent();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<Showcase products={[p1, p2, p3]} />);
      const region = screen.getByRole("region", { name: /destacados/i });

      act(() => vi.advanceTimersByTime(6000));
      expect(activeSlide()).toHaveAccessibleName("2 de 3");

      await user.hover(region);
      act(() => vi.advanceTimersByTime(12000));
      expect(activeSlide()).toHaveAccessibleName("2 de 3");

      await user.click(screen.getByRole("button", { name: "Pausar" }));
      expect(screen.getByRole("button", { name: "Reanudar" })).toBeInTheDocument();
      // Sin hover ni foco dentro, la pausa manual sigue.
      await user.unhover(region);
      act(() => screen.getByRole("button", { name: "Reanudar" }).blur());
      act(() => vi.advanceTimersByTime(12000));
      expect(activeSlide()).toHaveAccessibleName("2 de 3");

      // Reanudar vuelve a girar aunque el foco quede en el botón (patrón WAI-ARIA).
      await user.click(screen.getByRole("button", { name: "Reanudar" }));
      expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
      await user.unhover(region);
      act(() => vi.advanceTimersByTime(6000));
      expect(activeSlide()).toHaveAccessibleName("3 de 3");
      act(() => vi.advanceTimersByTime(6000));
      expect(activeSlide()).toHaveAccessibleName("1 de 3");
    });

    it("se pausa con el foco dentro de la región", () => {
      vi.useFakeTimers();
      render(<Showcase products={[p1, p2, p3]} />);

      const link = within(screen.getByRole("group", { name: "1 de 3" })).getByRole("link", {
        name: "Ver producto",
      });
      act(() => link.focus());
      act(() => vi.advanceTimersByTime(12000));
      expect(activeSlide()).toHaveAccessibleName("1 de 3");

      act(() => link.blur());
      act(() => vi.advanceTimersByTime(6000));
      expect(activeSlide()).toHaveAccessibleName("2 de 3");
    });

    it("se pausa con la pestaña oculta", () => {
      vi.useFakeTimers();
      const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
      render(<Showcase products={[p1, p2, p3]} />);
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      act(() => vi.advanceTimersByTime(12000));
      expect(activeSlide()).toHaveAccessibleName("1 de 3");
      hidden.mockRestore();
    });

    it("con reduced motion no avanza, no muestra Pausar y no anima el desplazamiento", async () => {
      useFakeTimersWithUserEvent();
      mockReducedMotion(true);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<Showcase products={[p1, p2, p3]} />);

      act(() => vi.advanceTimersByTime(12000));
      expect(activeSlide()).toHaveAccessibleName("1 de 3");
      expect(screen.queryByRole("button", { name: "Pausar" })).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Siguiente" }));
      expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: "auto" }));
    });
  });
});
