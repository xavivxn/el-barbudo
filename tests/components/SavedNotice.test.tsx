import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SavedNotice } from "@/components/admin/SavedNotice";

const nav = vi.hoisted(() => ({ search: "", path: "/admin" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.path,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

afterEach(cleanup);

describe("SavedNotice", () => {
  it("la región de estado existe siempre, vacía si no hay aviso", () => {
    nav.search = "";
    render(<SavedNotice />);
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
  });

  it("con ?guardado=1 muestra el texto dentro de la región de estado", () => {
    nav.search = "guardado=1";
    render(<SavedNotice />);
    expect(screen.getByRole("status")).toHaveTextContent("Producto guardado");
  });

  it("con ?guardado=servicio dice que el servicio se guardó", () => {
    nav.search = "guardado=servicio";
    nav.path = "/admin/servicios";
    render(<SavedNotice />);
    expect(screen.getByRole("status")).toHaveTextContent("Servicio guardado");
    expect(screen.getByRole("link", { name: "Cerrar aviso" })).toHaveAttribute("href", "/admin/servicios");
    nav.path = "/admin";
  });

  it("un valor desconocido de guardado no muestra nada", () => {
    nav.search = "guardado=otro";
    render(<SavedNotice />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("cerrar quita guardado y conserva el filtro de categoría", () => {
    nav.search = "categoria=cabello&guardado=1";
    render(<SavedNotice />);
    expect(screen.getByRole("link", { name: "Cerrar aviso" })).toHaveAttribute("href", "/admin?categoria=cabello");
  });

  it("cerrar sin otros parámetros vuelve a la ruta limpia", () => {
    nav.search = "guardado=1";
    render(<SavedNotice />);
    expect(screen.getByRole("link", { name: "Cerrar aviso" })).toHaveAttribute("href", "/admin");
  });
});
