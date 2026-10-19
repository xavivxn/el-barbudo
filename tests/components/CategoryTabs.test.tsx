import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryTabs } from "@/components/shop/home/CategoryTabs";
import { groupByCategory } from "@/lib/home";
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
    featured: false,
    active: true,
    variants: [{ id: "v", label: "50 ml", price: 100000, stock: 3 }],
    ...overrides,
  };
}

const catalog = [
  product({ id: "f1", slug: "noche-de-cuero", name: "Noche de Cuero", category: "perfume" }),
  product({ id: "f2", slug: "bleu", name: "Bleu", category: "perfume" }),
  product({ id: "b1", slug: "aceite-de-barba", name: "Aceite de barba", category: "barba" }),
  ...Array.from({ length: 5 }, (_, i) =>
    product({ id: `c${i}`, slug: `cabello-${i}`, name: `Cabello ${i}`, category: "cabello" }),
  ),
];
const groups = groupByCategory(catalog, 2);

describe("CategoryTabs", () => {
  it("una pestaña por categoría; la primera activa y los paneles inactivos ocultos", () => {
    render(<CategoryTabs groups={groups} />);

    expect(screen.getByRole("heading", { level: 2, name: "Explorá la tienda" })).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Perfumes", "Barba", "Cabello"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    // Roving tabIndex: solo la activa entra en el orden de Tab.
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);

    const panel = screen.getByRole("tabpanel", { name: "Perfumes" });
    expect(panel).toBeVisible();
    expect(panel).toHaveAttribute("tabindex", "0");
    expect(tabs[0]).toHaveAttribute("aria-controls", panel.id);
    expect(within(panel).getByRole("heading", { level: 3, name: "Noche de Cuero" })).toBeInTheDocument();

    // El nombre accesible de un elemento `hidden` sale vacío en dom-accessibility-api: se llega al panel
    // por la pestaña (aria-controls) y se comprueba que lo nombra (aria-labelledby).
    const barba = screen.getByRole("tab", { name: "Barba" });
    const hiddenPanel = screen.getAllByRole("tabpanel", { hidden: true }).find((el) => el.id === barba.getAttribute("aria-controls"));
    expect(hiddenPanel).toHaveAttribute("hidden");
    expect(hiddenPanel).toHaveAttribute("aria-labelledby", barba.id);
    expect(hiddenPanel).not.toBeVisible();
    // Sin JS los "Ver todos" de todas las categorías siguen en el HTML.
    expect(screen.getAllByRole("link", { hidden: true }).filter((el) => el.textContent?.startsWith("Ver todos"))).toHaveLength(3);
  });

  it("flechas, Home y End mueven foco y selección; da la vuelta en los extremos", async () => {
    const user = userEvent.setup();
    render(<CategoryTabs groups={groups} />);

    screen.getAllByRole("tab")[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Barba" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Barba" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(screen.getByRole("tabpanel", { name: "Barba" })).toBeVisible());

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Cabello" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Perfumes" })).toHaveAttribute("aria-selected", "false");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Perfumes" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Cabello" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Perfumes" })).toHaveAttribute("aria-selected", "true");

    // Alt/Cmd + flecha es del navegador: no cambia de pestaña.
    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(screen.getByRole("tab", { name: "Perfumes" })).toHaveAttribute("aria-selected", "true");
  });

  it("un clic cambia de pestaña y de panel; 'Ver todos' sigue a la categoría activa", async () => {
    const user = userEvent.setup();
    render(<CategoryTabs groups={groups} />);

    expect(screen.getByRole("link", { name: /ver todos \(2\)/i })).toHaveAttribute("href", "/productos?categoria=perfumes");

    await user.click(screen.getByRole("tab", { name: "Cabello" }));
    // `total` cuenta todos los de la categoría (5), no solo los 2 que se muestran.
    expect(screen.getByRole("link", { name: /ver todos \(5\)/i })).toHaveAttribute("href", "/productos?categoria=cabello");
    expect(screen.queryByRole("link", { name: /ver todos \(2\)/i })).not.toBeInTheDocument();

    const panel = await screen.findByRole("tabpanel", { name: "Cabello" });
    expect(within(panel).getAllByRole("heading", { level: 3 })).toHaveLength(2);
    // Cada categoría conserva su único tabpanel (id estable): el anterior solo pasa a `hidden`.
    const perfumes = screen.getByRole("tab", { name: "Perfumes" });
    const previous = document.getElementById(perfumes.getAttribute("aria-controls") ?? "");
    expect(previous).toHaveAttribute("hidden");
    expect(document.querySelectorAll('[role="tabpanel"]')).toHaveLength(3);
    expect(new Set([...document.querySelectorAll("[id]")].map((el) => el.id)).size).toBe(document.querySelectorAll("[id]").length);
  });

  it("con una sola categoría hay una pestaña única seleccionada", () => {
    render(<CategoryTabs groups={[groups[1]]} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Barba" })).toBeVisible();
    expect(screen.getByRole("link", { name: /ver todos \(1\)/i })).toHaveAttribute("href", "/productos?categoria=barba");
  });

  it("sin categorías no renderiza nada", () => {
    const { container } = render(<CategoryTabs groups={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("HTML del servidor (sin JS): todos los paneles, los inactivos ocultos, el activo visible y todos los 'Ver todos'", () => {
    const html = renderToString(<CategoryTabs groups={groups} />);
    const doc = new DOMParser().parseFromString(html, "text/html");

    const panels = [...doc.querySelectorAll('[role="tabpanel"]')];
    expect(panels).toHaveLength(3);
    expect(panels.map((panel) => panel.hasAttribute("hidden"))).toEqual([false, true, true]);
    // El panel activo trae sus tarjetas y ninguna parte de opacidad 0 (invisible sin JS).
    expect(panels[0].querySelectorAll("li")).toHaveLength(2);
    expect(html).not.toMatch(/opacity:\s*0\s*[;"]/);

    const seeAll = [...doc.querySelectorAll("a")].filter((link) => link.textContent?.startsWith("Ver todos"));
    expect(seeAll.map((link) => link.getAttribute("href"))).toEqual([
      "/productos?categoria=perfumes",
      "/productos?categoria=barba",
      "/productos?categoria=cabello",
    ]);
    expect(seeAll.map((link) => link.hasAttribute("hidden"))).toEqual([false, true, true]);
  });
});
