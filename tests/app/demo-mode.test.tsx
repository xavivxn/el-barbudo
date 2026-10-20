import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Modo demo: `DEMO_MODE` se lee al cargar `@/lib/demo`, así que cada prueba recarga los módulos con
 * la variable que necesita (`vitest.config.ts` la deja en "false" para el resto de las pruebas).
 */

const cookies = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ cookies }));

const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
);
vi.mock("next/navigation", () => ({ redirect }));

// La cabecera, el pie y el carrito tienen sus propias pruebas: acá solo importa el marco.
vi.mock("@/components/shop/Header", () => ({ Header: () => <header>cabecera</header> }));
vi.mock("@/components/shop/Footer", () => ({ Footer: () => <footer>pie</footer> }));
vi.mock("@/components/shop/CartDrawer", () => ({ CartDrawer: () => null }));

async function withDemo(value: "true" | "false") {
  vi.resetModules();
  vi.stubEnv("DEMO_MODE", value);
  // Sin variables: en la demo nada debería necesitarlas.
  vi.stubEnv("SESSION_SECRET", "");
  vi.stubEnv("ADMIN_PASSWORD", "");
}

beforeEach(() => {
  cookies.mockReset();
  redirect.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("requireAdmin en modo demo", () => {
  it("redirige al aviso de /admin sin leer la sesión ni las variables", async () => {
    await withDemo("true");
    const { requireAdmin } = await import("@/lib/auth");
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/admin");
    expect(redirect).toHaveBeenCalledWith("/admin");
    expect(cookies).not.toHaveBeenCalled();
  });

  it("fuera de la demo sigue leyendo la sesión (y sin SESSION_SECRET falla)", async () => {
    await withDemo("false");
    const { requireAdmin } = await import("@/lib/auth");
    await expect(requireAdmin()).rejects.toThrow(/SESSION_SECRET/);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("login y logout en modo demo", () => {
  it("login devuelve el aviso de la demo sin tocar la sesión", async () => {
    await withDemo("true");
    const { login } = await import("@/app/admin/login/actions");
    const form = new FormData();
    form.set("password", "lo-que-sea");
    expect(await login({}, form)).toEqual({ error: "El panel está deshabilitado en la demo." });
    expect(cookies).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("fuera de la demo, login con contraseña incorrecta sigue diciendo eso", async () => {
    await withDemo("false");
    vi.stubEnv("ADMIN_PASSWORD", "una-frase-larga-y-propia");
    const { login } = await import("@/app/admin/login/actions");
    const form = new FormData();
    form.set("password", "otra");
    expect(await login({}, form)).toEqual({ error: "Contraseña incorrecta." });
  });

  it("logout redirige al aviso sin tocar la sesión", async () => {
    await withDemo("true");
    const { logout } = await import("@/app/admin/login/actions");
    await expect(logout()).rejects.toThrow("NEXT_REDIRECT:/admin");
    expect(cookies).not.toHaveBeenCalled();
  });
});

describe("layout del admin", () => {
  async function renderAdmin() {
    const { default: AdminLayout, metadata } = await import("@/app/admin/layout");
    render(
      <AdminLayout>
        <p>contenido del panel</p>
      </AdminLayout>,
    );
    return metadata;
  }

  it("en modo demo muestra el aviso en lugar del panel y sigue sin indexarse", async () => {
    await withDemo("true");
    const metadata = await renderAdmin();
    expect(screen.getByRole("heading", { level: 1, name: "Panel deshabilitado en la demo" })).toBeInTheDocument();
    expect(
      screen.getByText("Esta es una tienda de demostración: el panel de administración está apagado."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a la tienda" })).toHaveAttribute("href", "/");
    expect(screen.queryByText("contenido del panel")).not.toBeInTheDocument();
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("fuera de la demo muestra el panel", async () => {
    await withDemo("false");
    await renderAdmin();
    expect(screen.getByText("contenido del panel")).toBeInTheDocument();
    expect(screen.queryByText("Panel deshabilitado en la demo")).not.toBeInTheDocument();
  });
});

describe("tienda en modo demo", () => {
  async function renderShell(children: ReactNode = <p>vitrina</p>) {
    const { ShopShell } = await import("@/components/shop/ShopShell");
    render(<ShopShell>{children}</ShopShell>);
  }

  it.each(["true", "false"] as const)("con DEMO_MODE=%s no muestra ninguna franja de demostración", async (value) => {
    await withDemo(value);
    await renderShell();
    expect(screen.queryByText(/tienda de demostración/i)).not.toBeInTheDocument();
    expect(screen.getByText("cabecera")).toBeInTheDocument();
    expect(screen.getByText("vitrina")).toBeInTheDocument();
  });
});
