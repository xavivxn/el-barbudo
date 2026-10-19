import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FragranceFinder } from "@/components/shop/home/FragranceFinder";
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

const inStock = [{ id: "v", label: "50 ml", price: 100000, stock: 3 }];
const outOfStock = [{ id: "v", label: "50 ml", price: 100000, stock: 0 }];

function product(id: string, overrides: Partial<ProductDTO>): ProductDTO {
  return {
    id,
    slug: id,
    name: id,
    subtitle: "",
    category: "perfume",
    description: "",
    notes: null,
    benefits: [],
    tags: [],
    images: ["https://images.unsplash.com/photo-1?w=1200&q=75"],
    featured: false,
    active: true,
    variants: inStock,
    ...overrides,
  };
}

const nocheAmaderado = product("noche-amaderado", { name: "Noche Amaderada", tags: ["noche", "amaderado"], featured: true });
const diaFresco = product("dia-fresco", { name: "Día Fresco", tags: ["día", "fresco"], featured: true });
const nocheDulce = product("noche-dulce", { name: "Noche Dulce", tags: ["noche", "dulce"], variants: outOfStock });
const all = [nocheDulce, nocheAmaderado, diaFresco];

const cardNames = () =>
  within(screen.getByRole("list", { name: "Perfumes sugeridos" }))
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);

describe("FragranceFinder", () => {
  it("filtra por momento y estilo, avisa cuando no hay uno exacto y 'Limpiar' vuelve a empezar", async () => {
    const user = userEvent.setup();
    render(<FragranceFinder perfumes={all} />);

    expect(screen.getByRole("heading", { name: "Encontrá tu fragancia" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Noche" }));
    expect(screen.getByRole("button", { name: "Noche" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Amaderado" }));
    expect(screen.getByRole("status")).toHaveTextContent("1 perfume para vos");
    expect(cardNames()).toEqual(["Noche Amaderada"]);

    await user.click(screen.getByRole("button", { name: "Noche" })); // toggle off
    await user.click(screen.getByRole("button", { name: "Día" }));
    await user.click(screen.getByRole("button", { name: "Dulce" }));
    expect(screen.getByText("No hay uno exacto; estos se acercan.")).toBeInTheDocument();
    // Día + Amaderado + Dulce: ninguno exacto. Parciales, nunca una sección vacía; el agotado queda al final.
    expect(cardNames()).toEqual(["Noche Amaderada", "Día Fresco", "Noche Dulce"]);

    await user.click(screen.getByRole("button", { name: "Limpiar" }));
    // `getAllByRole` lanza si no hay coincidencias: con cero botones presionados va `queryAllByRole`.
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });

  it("sin selección muestra los destacados, sin aviso y sin 'Limpiar'", () => {
    render(<FragranceFinder perfumes={all} />);

    expect(screen.getByRole("group", { name: /¿Para cuándo\?/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /¿Qué estilo\?/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(8);
    expect(screen.getByRole("status")).toHaveTextContent("2 perfumes para vos");
    expect(cardNames()).toEqual(["Noche Amaderada", "Día Fresco"]);
    expect(screen.queryByText("No hay uno exacto; estos se acercan.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Limpiar" })).not.toBeInTheDocument();
  });

  it("el momento es de selección única; los estilos, múltiple", async () => {
    const user = userEvent.setup();
    render(<FragranceFinder perfumes={all} />);

    await user.click(screen.getByRole("button", { name: "Noche" }));
    await user.click(screen.getByRole("button", { name: "Día" }));
    expect(screen.getByRole("button", { name: "Día" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Noche" })).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "Fresco" }));
    await user.click(screen.getByRole("button", { name: "Suave" }));
    expect(screen.getByRole("button", { name: "Fresco" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Suave" })).toHaveAttribute("aria-pressed", "true");
  });

  it("'Limpiar' devuelve el foco a la primera opción (no se pierde al desaparecer el botón)", async () => {
    const user = userEvent.setup();
    render(<FragranceFinder perfumes={all} />);

    await user.click(screen.getByRole("button", { name: "Intenso" }));
    await user.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(screen.queryByRole("button", { name: "Limpiar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Día" })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("2 perfumes para vos");
  });

  it("sin perfumes no renderiza nada", () => {
    const { container } = render(<FragranceFinder perfumes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("HTML del servidor (sin JS): las tarjetas se ven y las flechas del riel no se muestran", () => {
    const html = renderToString(<FragranceFinder perfumes={all} />);
    const doc = new DOMParser().parseFromString(html, "text/html");

    expect(doc.querySelectorAll("ul li h3")).toHaveLength(2);
    expect(html).not.toMatch(/opacity:\s*0\s*[;"]/);
    expect(doc.querySelector('[aria-label="Anterior"]')?.closest("[hidden]")).not.toBeNull();
  });
});
