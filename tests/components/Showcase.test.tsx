import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Showcase } from "@/components/shop/home/Showcase";
import type { ProductDTO } from "@/lib/types";

type MockImageProps = ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; preload?: boolean };

// En jsdom no hay IntersectionObserver: `useInView` se controla desde cada test (por defecto, en pantalla).
const viewport = vi.hoisted(() => ({ inView: true }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useInView: () => viewport.inView,
}));

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
  viewport.inView = true;
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

    await user.click(screen.getByRole("button", { name: "Destacado siguiente" }));
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

    // Circular: desde la primera, "Destacado anterior" va a la última.
    await user.click(screen.getByRole("button", { name: "Destacado anterior" }));
    expect(screen.getByRole("button", { name: "Ir al destacado 3" })).toHaveAttribute("aria-current", "true");

    await user.click(screen.getByRole("button", { name: "Ir al destacado 2" }));
    expect(activeSlide()).toHaveAccessibleName("2 de 3");
  });

  it("las flechas tienen nombres propios de la vitrina y controlan el riel de diapositivas", () => {
    render(<Showcase products={[p1, p2, p3]} />);
    const track = screen.getByRole("group", { name: "1 de 3" }).parentElement as HTMLElement;

    expect(track.id).not.toBe("");
    for (const name of ["Destacado anterior", "Destacado siguiente"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-controls", track.id);
    }
    expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Siguiente" })).not.toBeInTheDocument();
  });

  it("la foto de la diapositiva 2 carga ya (eager); de la 3 en adelante, diferida", () => {
    render(<Showcase products={[p1, p2, p3, soldOutNoPhoto, product({ id: "p5", slug: "p5", name: "Quinto" })]} />);
    const image = (n: number) => screen.getByRole("group", { name: `${n} de 5` }).querySelector("img");

    expect(image(2)).toHaveAttribute("loading", "eager");
    expect(image(3)).not.toHaveAttribute("loading", "eager");
    expect(image(5)).not.toHaveAttribute("loading", "eager");
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

  it("muestra el eyebrow 'Destacado · N/M' en cada diapositiva", () => {
    render(<Showcase products={[p1, p2, p3, soldOutNoPhoto]} />);
    const slide = screen.getByRole("group", { name: "1 de 4" });
    expect(
      within(slide).getByText((_, element) => element?.tagName === "P" && element.textContent === "Destacado · 1/4"),
    ).toBeInTheDocument();
  });

  it("el botón de rotación es lo primero de la región, antes de las diapositivas", () => {
    render(<Showcase products={[p1, p2, p3]} />);
    const region = screen.getByRole("region", { name: /destacados/i });

    const rotation = screen.getByRole("button", { name: "Pausar" });
    const focusables = region.querySelectorAll("button, a[href]");
    expect(focusables[0]).toBe(rotation);
    expect(
      rotation.compareDocumentPosition(screen.getByRole("group", { name: "1 de 3" })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("la bruma de fragancia es un solo canvas, en la diapositiva activa, y se muda con ella", async () => {
    useFakeTimersWithUserEvent();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<Showcase products={[p1, p2, p3]} />);
    expect(container.querySelectorAll("canvas")).toHaveLength(1);
    expect(activeSlide()).toContainElement(container.querySelector("canvas"));

    await user.click(screen.getByRole("button", { name: "Destacado siguiente" }));
    expect(activeSlide()).toHaveAccessibleName("2 de 3");
    // La saliente no se corta: se funde (~400 ms) y recién después se desmonta.
    const leaving = screen.getByRole("group", { name: "1 de 3" }).querySelector("canvas");
    expect(leaving).toHaveAttribute("data-leaving");
    expect(activeSlide()?.querySelector("canvas")).not.toHaveAttribute("data-leaving");

    act(() => vi.advanceTimersByTime(400));
    expect(container.querySelectorAll("canvas")).toHaveLength(1);
    expect(activeSlide()).toContainElement(container.querySelector("canvas"));
  });

  it("el carrusel recorta sin ser una caja desplazable y cada diapositiva contiene sus absolutos", () => {
    render(<Showcase products={[p1, p2, p3]} />);
    const region = screen.getByRole("region", { name: /destacados/i });
    // `overflow-clip` recorta igual (con las esquinas redondeadas) pero no se puede desplazar por código.
    expect(region).toHaveClass("overflow-clip", "rounded-2xl");
    expect(region).not.toHaveClass("overflow-hidden");
    // Los `sr-only` (absolutos) de cada diapositiva quedan dentro de ella, no del riel.
    for (const slide of within(region).getAllByRole("group")) expect(slide).toHaveClass("relative");
  });

  it("el borde de luz gira solo en la activa y se pausa fuera de la pantalla", () => {
    const { container, rerender } = render(<Showcase products={[p1, p2, p3]} />);
    const frames = () => Array.from(container.querySelectorAll<HTMLElement>(".showcase-rim"));
    expect(frames().map((frame) => frame.dataset.rim)).toEqual(["on", undefined, undefined]);

    viewport.inView = false;
    rerender(<Showcase products={[p1, p2, p3]} />);
    expect(frames().map((frame) => frame.dataset.rim)).toEqual(["paused", undefined, undefined]);
  });

  it("con reduced motion no hay bruma", () => {
    mockReducedMotion(true);
    const { container } = render(<Showcase products={[p1, p2, p3]} />);
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("los saltos de más de una diapositiva (y la vuelta circular) no desplazan con animación", async () => {
    const user = userEvent.setup();
    render(<Showcase products={[p1, p2, p3]} />);

    await user.click(screen.getByRole("button", { name: "Ir al destacado 3" }));
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: "auto" }));
    await user.click(screen.getByRole("button", { name: "Destacado siguiente" }));
    expect(screen.getByRole("button", { name: "Ir al destacado 1" })).toHaveAttribute("aria-current", "true");
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: "auto" }));
    await user.click(screen.getByRole("button", { name: "Destacado siguiente" }));
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: "smooth" }));
  });

  it("con foco en un enlace de la diapositiva, las flechas pasan el foco a la diapositiva nueva", async () => {
    const user = userEvent.setup();
    render(<Showcase products={[p1, p2, p3]} />);

    act(() =>
      within(screen.getByRole("group", { name: "1 de 3" }))
        .getByRole("link", { name: "Ver producto" })
        .focus(),
    );
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("group", { name: "2 de 3" })).toHaveFocus();
    expect(screen.getByRole("group", { name: "2 de 3" })).not.toHaveAttribute("inert");
  });

  it("si la lista se achica, la diapositiva activa queda dentro del rango", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Showcase products={[p1, p2, p3, soldOutNoPhoto]} />);
    await user.click(screen.getByRole("button", { name: "Ir al destacado 4" }));

    rerender(<Showcase products={[p1, p2]} />);
    expect(activeSlide()).toHaveAccessibleName("2 de 2");
    expect(screen.getByRole("button", { name: "Ir al destacado 2" })).toHaveAttribute("aria-current", "true");
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

    it("tras Reanudar, el foco en un enlace de la diapositiva vuelve a pausar y no se pierde", async () => {
      useFakeTimersWithUserEvent();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<Showcase products={[p1, p2, p3]} />);

      await user.click(screen.getByRole("button", { name: "Pausar" }));
      await user.click(screen.getByRole("button", { name: "Reanudar" }));
      await user.unhover(screen.getByRole("region", { name: /destacados/i }));
      const link = within(screen.getByRole("group", { name: "1 de 3" })).getByRole("link", {
        name: "Ver producto",
      });
      act(() => link.focus());
      act(() => vi.advanceTimersByTime(12000));

      expect(activeSlide()).toHaveAccessibleName("1 de 3");
      expect(link).toHaveFocus();
    });

    it("anuncia los cambios solo sin rotación y la barra activa queda llena en pausa", async () => {
      useFakeTimersWithUserEvent();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<Showcase products={[p1, p2, p3]} />);
      const track = screen.getByRole("group", { name: "1 de 3" }).parentElement as HTMLElement;
      const fill = (n: number) =>
        screen.getByRole("button", { name: `Ir al destacado ${n}` }).querySelector("[data-progress]");

      expect(track).toHaveAttribute("aria-live", "off");
      expect(fill(1)).toHaveAttribute("data-progress", "running");
      expect(fill(2)).toHaveAttribute("data-progress", "empty");

      await user.click(screen.getByRole("button", { name: "Pausar" }));
      expect(track).toHaveAttribute("aria-live", "polite");
      expect(fill(1)).toHaveAttribute("data-progress", "full");
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

    it("no avanza mientras la vitrina está fuera de la pantalla y arranca al volver", () => {
      vi.useFakeTimers();
      viewport.inView = false;
      const { rerender } = render(<Showcase products={[p1, p2, p3]} />);

      act(() => vi.advanceTimersByTime(12000));
      expect(activeSlide()).toHaveAccessibleName("1 de 3");
      // Sin rotación, la barra activa queda llena (no corre).
      expect(
        screen.getByRole("button", { name: "Ir al destacado 1" }).querySelector("[data-progress]"),
      ).toHaveAttribute("data-progress", "full");

      viewport.inView = true;
      rerender(<Showcase products={[p1, p2, p3]} />);
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

      await user.click(screen.getByRole("button", { name: "Destacado siguiente" }));
      expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: "auto" }));
    });
  });
});
