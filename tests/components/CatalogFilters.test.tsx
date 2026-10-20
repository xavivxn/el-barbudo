import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogFilters } from "@/components/shop/CatalogFilters";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(cleanup);

const tags = ["amaderado", "fresco", "noche"];

describe("CatalogFilters", () => {
  it("categorías y etiquetas son enlaces que conservan los otros filtros", () => {
    render(<CatalogFilters categoria="perfumes" etiqueta="fresco" orden="precio-asc" tags={tags} />);

    const categories = screen.getByRole("navigation", { name: "Categorías" });
    expect(within(categories).getByRole("link", { name: "Perfumes" })).toHaveAttribute("aria-current", "page");
    expect(within(categories).getByRole("link", { name: "Barba" })).toHaveAttribute(
      "href",
      "/productos?categoria=barba&etiqueta=fresco&orden=precio-asc",
    );
    expect(within(categories).getByRole("link", { name: "Todos" })).toHaveAttribute(
      "href",
      "/productos?etiqueta=fresco&orden=precio-asc",
    );

    // Riel de desktop: la activa vuelve a quitarse; las otras reemplazan.
    const rail = screen.getByRole("navigation", { name: "Etiquetas" });
    expect(within(rail).getByRole("link", { name: "fresco" })).toHaveAttribute(
      "href",
      "/productos?categoria=perfumes&orden=precio-asc",
    );
    expect(within(rail).getByRole("link", { name: "noche" })).toHaveAttribute(
      "href",
      "/productos?categoria=perfumes&etiqueta=noche&orden=precio-asc",
    );
  });

  it("\"Limpiar\" solo aparece con un filtro activo y vuelve al catálogo completo", () => {
    const { rerender } = render(<CatalogFilters orden="destacados" tags={tags} />);
    expect(screen.queryByRole("link", { name: "Limpiar filtros" })).not.toBeInTheDocument();

    rerender(<CatalogFilters etiqueta="noche" orden="destacados" tags={tags} />);
    expect(screen.getByRole("link", { name: "Limpiar filtros" })).toHaveAttribute("href", "/productos");
  });

  it("el orden es un formulario GET que conserva categoría y etiqueta", () => {
    render(<CatalogFilters categoria="barba" etiqueta="natural" orden="nombre" tags={tags} />);
    const select = screen.getByRole("combobox", { name: "Ordenar por" });
    expect(select).toHaveValue("nombre");
    const form = select.closest("form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "get");
    expect(form.querySelector('input[name="categoria"]')).toHaveValue("barba");
    expect(form.querySelector('input[name="etiqueta"]')).toHaveValue("natural");
  });

  it("en móvil el botón de etiquetas enlaza a la hoja, que marca la activa y permite quitarla", () => {
    render(<CatalogFilters etiqueta="fresco" orden="destacados" tags={tags} />);
    const trigger = screen.getByRole("link", { name: /etiquetas.*activa: fresco/i });
    expect(trigger).toHaveAttribute("href", "#etiquetas");

    const sheet = document.getElementById("etiquetas") as HTMLDialogElement;
    expect(sheet.tagName).toBe("DIALOG");
    // La hoja está cerrada (oculta para el árbol accesible) hasta que se abre.
    expect(within(sheet).getByRole("link", { name: "fresco", hidden: true })).toHaveAttribute("aria-current", "page");
    expect(within(sheet).getByRole("link", { name: /quitar etiqueta/i, hidden: true })).toHaveAttribute(
      "href",
      "/productos",
    );
  });

  it("sin etiquetas no hay riel, hoja ni separador", () => {
    render(<CatalogFilters orden="destacados" tags={[]} />);
    expect(screen.queryByRole("navigation", { name: "Etiquetas" })).not.toBeInTheDocument();
    expect(document.getElementById("etiquetas")).toBeNull();
  });
});
