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

import EditProductPage from "@/app/admin/(panel)/productos/[id]/page";
import NewProductPage from "@/app/admin/(panel)/productos/nuevo/page";
import AdminProductsPage from "@/app/admin/(panel)/page";
import AdminServicesPage from "@/app/admin/(panel)/servicios/page";

const NO_SESSION = new Error("NEXT_REDIRECT:/admin/login");

beforeEach(() => {
  vi.resetAllMocks();
  requireAdmin.mockImplementation(async () => {
    throw NO_SESSION;
  });
});

describe("las páginas del panel piden sesión antes de leer datos", () => {
  it.each([
    ["panel de productos", () => AdminProductsPage({ searchParams: Promise.resolve({}) })],
    ["producto nuevo", () => NewProductPage()],
    ["editar producto", () => EditProductPage({ params: Promise.resolve({ id: "p1" }) })],
    ["servicios", () => AdminServicesPage()],
  ])("%s", async (_name, render) => {
    await expect(render()).rejects.toBe(NO_SESSION);
    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect(products.listProducts).not.toHaveBeenCalled();
    expect(products.getProductById).not.toHaveBeenCalled();
    expect(services.listServices).not.toHaveBeenCalled();
  });
});
