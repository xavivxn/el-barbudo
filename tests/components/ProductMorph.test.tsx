import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Showcase } from "@/components/shop/home/Showcase";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { resetMorph } from "@/lib/morph";
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

// jsdom no tiene View Transitions: el <ViewTransition> de prueba deja su `name` en el DOM para contarlo.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    ViewTransition: ({ name, children }: { name?: string; children?: ReactNode }) => (
      <div data-vt={name ?? ""} style={{ display: "contents" }}>
        {children}
      </div>
    ),
  };
});

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useInView: () => true,
}));

const perfume: ProductDTO = {
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

/** Nombres de View Transition presentes: los del componente y cualquier `view-transition-name` en línea. */
function transitionNames(container: HTMLElement) {
  const fromComponent = Array.from(container.querySelectorAll<HTMLElement>("[data-vt]"))
    .map((node) => node.dataset.vt)
    .filter((name): name is string => Boolean(name));
  const inline = Array.from(container.querySelectorAll<HTMLElement>("*"))
    .map((node) => node.style.viewTransitionName)
    .filter((name) => name && name !== "none");
  return [...fromComponent, ...inline];
}

/** El mismo producto en la vitrina, una pestaña, una pestaña oculta y el buscador. */
function Duplicates() {
  return (
    <>
      <Showcase products={[perfume]} />
      <ProductCard product={perfume} />
      <div hidden>
        <ProductCard product={perfume} />
      </div>
      <ProductCard product={perfume} />
    </>
  );
}

function cardLinks() {
  // Cada tarjeta tiene dos enlaces a la ficha (foto y nombre); el de la vitrina es "Ver producto".
  return screen
    .getAllByRole("link", { hidden: true })
    .filter((link) => link.getAttribute("href") === "/productos/noche-de-cuero");
}

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  act(() => resetMorph());
  window.matchMedia = originalMatchMedia;
});

describe("la foto vuela a la ficha: nombres de View Transition", () => {
  it("con el producto repetido, nadie lleva nombre hasta que se activa una instancia", () => {
    const { container } = render(<Duplicates />);
    expect(cardLinks().length).toBeGreaterThanOrEqual(7);
    expect(transitionNames(container)).toEqual([]);
  });

  it("al activar una tarjeta (pointerdown), exactamente una lleva el nombre", () => {
    const { container } = render(<Duplicates />);
    // [0] "Ver producto" de la vitrina, [1] foto y [2] nombre de la primera tarjeta, …
    const [, firstCardPhoto] = cardLinks();
    fireEvent.pointerDown(firstCardPhoto, { button: 0, pointerType: "mouse" });
    expect(transitionNames(container)).toEqual(["producto-noche-de-cuero"]);
  });

  it("el nombre pasa a la última instancia activada: nunca hay dos", () => {
    const { container } = render(<Duplicates />);
    const links = cardLinks();
    const showcaseCta = screen.getByRole("link", { name: "Ver producto" });

    fireEvent.pointerDown(showcaseCta, { button: 0, pointerType: "touch" });
    expect(transitionNames(container)).toEqual(["producto-noche-de-cuero"]);
    // El nombre está en la foto enmarcada de la vitrina, no en el botón.
    const named = container.querySelector('[data-vt="producto-noche-de-cuero"]');
    expect(named?.querySelector("img")).not.toBeNull();
    expect(named?.contains(showcaseCta)).toBe(false);

    // Enter sobre el nombre de la tarjeta del buscador (la última).
    fireEvent.keyDown(links[links.length - 1], { key: "Enter" });
    expect(transitionNames(container)).toEqual(["producto-noche-de-cuero"]);
    expect(container.querySelectorAll('[data-vt="producto-noche-de-cuero"]')).toHaveLength(1);
  });

  it("también con clic (p. ej. Enter del teclado dispara click)", () => {
    const { container } = render(<Duplicates />);
    const titleLink = screen.getAllByRole("link", { name: "Noche de Cuero" })[0];
    // Sin router en jsdom: se cancela la navegación de next/link antes de que llegue a React.
    const cancel = (event: Event) => event.preventDefault();
    window.addEventListener("click", cancel, { capture: true });
    fireEvent.click(titleLink, { button: 0 });
    window.removeEventListener("click", cancel, { capture: true });
    expect(transitionNames(container)).toEqual(["producto-noche-de-cuero"]);
  });

  it("clic con Cmd/Ctrl (otra pestaña) o botón secundario no arma el nombre", () => {
    const { container } = render(<Duplicates />);
    const [, photo] = cardLinks();
    fireEvent.pointerDown(photo, { button: 0, metaKey: true, pointerType: "mouse" });
    fireEvent.pointerDown(photo, { button: 0, ctrlKey: true, pointerType: "mouse" });
    fireEvent.pointerDown(photo, { button: 1, pointerType: "mouse" });
    expect(transitionNames(container)).toEqual([]);
  });

  it("la galería de la ficha siempre lleva el nombre (es la única)", () => {
    const { container } = render(
      <ProductGallery slug="noche-de-cuero" images={perfume.images} name="Noche de Cuero" />,
    );
    expect(transitionNames(container)).toEqual(["producto-noche-de-cuero"]);
  });

  it("al navegar (la tarjeta activada se desmonta) el nombre se suelta: nadie lo hereda", () => {
    const home = render(<Duplicates />);
    fireEvent.pointerDown(cardLinks()[2], { button: 0, pointerType: "mouse" });
    expect(transitionNames(home.container)).toEqual(["producto-noche-de-cuero"]);

    // La portada se desmonta y en la ficha la galería es la única con nombre.
    home.unmount();
    const page = render(
      <ProductGallery slug="noche-de-cuero" images={perfume.images} name="Noche de Cuero" />,
    );
    expect(transitionNames(page.container)).toEqual(["producto-noche-de-cuero"]);
  });

  it("al volver a la portada, ninguna tarjeta trae el nombre armado", () => {
    const home = render(<Duplicates />);
    fireEvent.pointerDown(cardLinks()[2], { button: 0, pointerType: "mouse" });
    home.unmount();
    const again = render(<Duplicates />);
    expect(transitionNames(again.container)).toEqual([]);
  });
});
