import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminError from "@/app/admin/(panel)/error";
import AdminNotFound from "@/app/admin/not-found";
import ShopError from "@/app/(shop)/error";
import { whatsappUrl } from "@/lib/whatsapp";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("error del panel", () => {
  it("dice qué pasó, Reintentar vuelve a pedir los datos y hay salida al panel", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<AdminError error={new Error("db caída")} retry={retry} />);

    const heading = screen.getByRole("heading", { level: 1, name: "Algo salió mal" });
    expect(heading).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Volver al panel" })).toHaveAttribute("href", "/admin");
  });
});

describe("error de la tienda", () => {
  it("ofrece Reintentar y pedir por WhatsApp aunque la base no responda", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<ShopError error={new Error("db caída")} retry={retry} />);

    expect(screen.getByRole("heading", { level: 1, name: "No pudimos cargar la tienda" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);
    const whatsapp = screen.getByRole("link", { name: "Escribinos por WhatsApp" });
    expect(whatsapp).toHaveAttribute("href", whatsappUrl("Hola El Barbudo"));
    expect(whatsapp).toHaveAttribute("target", "_blank");
  });
});

describe("404 del admin", () => {
  it("usa el marco del admin y lleva de vuelta al panel, sin la tienda", () => {
    render(<AdminNotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "No encontramos esta página" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al panel" })).toHaveAttribute("href", "/admin");
    expect(screen.queryByRole("button", { name: /carrito/i })).not.toBeInTheDocument();
  });
});
