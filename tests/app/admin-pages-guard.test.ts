import { readdirSync } from "node:fs";
import { basename, join, sep } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// R16: el guard del layout puede saltarse en pedidos RSC, así que cada página lo repite.
const requireAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ requireAdmin }));

const products = vi.hoisted(() => ({ listProducts: vi.fn(), getProductById: vi.fn() }));
vi.mock("@/lib/products", () => products);

const services = vi.hoisted(() => ({ listServices: vi.fn() }));
vi.mock("@/lib/services", () => services);

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

/**
 * Todas las páginas del panel, buscadas en disco: una página nueva entra sola en esta prueba y no
 * puede saltarse el guard sin que falle.
 */
const PANEL_DIR = join(process.cwd(), "src/app/admin/(panel)");
const pages = readdirSync(PANEL_DIR, { recursive: true, encoding: "utf8" })
  .filter((file) => basename(file) === "page.tsx")
  .map((file) => file.split(sep).join("/"))
  .sort();

type Page = (props: { params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string>> }) => unknown;

const NO_SESSION = new Error("NEXT_REDIRECT:/admin/login");

beforeEach(() => {
  vi.resetAllMocks();
  requireAdmin.mockImplementation(async () => {
    throw NO_SESSION;
  });
});

describe("las páginas del panel piden sesión antes de leer datos", () => {
  it("encuentra las páginas del panel", () => {
    // Si la búsqueda dejara de encontrar archivos, la prueba de abajo pasaría sin probar nada.
    expect(pages).toEqual(
      expect.arrayContaining(["page.tsx", "productos/[id]/page.tsx", "productos/nuevo/page.tsx", "servicios/page.tsx"]),
    );
  });

  it.each(pages)("%s", async (file) => {
    const { default: Page } = (await import(/* @vite-ignore */ join(PANEL_DIR, file))) as { default: Page };
    // Cada página recibe solo lo que usa: se le pasan params y searchParams a todas.
    const render = async () => Page({ params: Promise.resolve({ id: "p1" }), searchParams: Promise.resolve({}) });
    await expect(render()).rejects.toBe(NO_SESSION);
    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect(products.listProducts).not.toHaveBeenCalled();
    expect(products.getProductById).not.toHaveBeenCalled();
    expect(services.listServices).not.toHaveBeenCalled();
  });
});
