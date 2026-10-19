import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { refreshCart } from "@/app/(shop)/actions";
import { CartDrawer } from "@/components/shop/CartDrawer";
import type { VariantSnapshot } from "@/lib/types";
import { type CartItem, useCart } from "@/stores/cart";

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

vi.mock("@/app/(shop)/actions", () => ({ refreshCart: vi.fn() }));

const refresh = vi.mocked(refreshCart);

// jsdom no implementa showModal/close: lo mínimo para que `open` y el evento `close` existan.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  refresh.mockReset();
  refresh.mockResolvedValue([]);
  useCart.setState({ items: [], isOpen: false });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function item(overrides: Partial<CartItem>): CartItem {
  return {
    variantId: "v1",
    productId: "p1",
    slug: "producto",
    name: "Producto",
    variantLabel: null,
    unitPrice: 100000,
    image: null,
    quantity: 1,
    maxStock: 5,
    ...overrides,
  };
}

const noirQty3 = item({
  variantId: "noir-100",
  slug: "noir-intense",
  name: "Noir Intense",
  variantLabel: "100 ml",
  unitPrice: 285000,
  quantity: 3,
  maxStock: 3,
});
const borrado = item({ variantId: "gone", name: "Producto borrado", unitPrice: 50000 });

/** Lo que la base tiene hoy de cada variante de estas pruebas (sin cambios respecto del carrito). */
const CURRENT: Record<string, Pick<VariantSnapshot, "name" | "slug" | "image" | "variantLabel">> = {
  "noir-100": { name: "Noir Intense", slug: "noir-intense", image: null, variantLabel: "100 ml" },
  "noir-50": { name: "Noir Intense", slug: "noir-intense", image: null, variantLabel: "50 ml" },
  gone: { name: "Producto borrado", slug: "producto", image: null, variantLabel: null },
  v1: { name: "Cera", slug: "producto", image: null, variantLabel: null },
};

function snap(id: string, overrides: Partial<VariantSnapshot> = {}): VariantSnapshot {
  return { id, price: 100000, stock: 5, available: true, ...CURRENT[id], ...overrides };
}

describe("CartDrawer", () => {
  it("el aviso y la lista comparten el scroll: un aviso largo no encoge la lista", async () => {
    refresh.mockResolvedValue([snap("noir-100"), snap("gone", { available: false })]);
    useCart.setState({ items: [noirQty3, borrado], isOpen: true });

    render(<CartDrawer />);

    const status = await screen.findByRole("status");
    await waitFor(() => expect(status).toHaveTextContent("Producto borrado"));
    const list = screen.getByRole("list");
    expect(status.parentElement).toBe(list.parentElement);
    expect(status.parentElement).toHaveClass("overflow-y-auto");
  });

  it("al abrir reconcilia con el servidor, avisa qué cambió y recalcula total y mensaje", async () => {
    refresh.mockResolvedValue([
      snap("noir-100", { price: 285000, stock: 1 }),
      snap("gone", { available: false }),
    ]);
    useCart.setState({ items: [noirQty3, borrado], isOpen: true });

    render(<CartDrawer />);

    // La región role="status" está siempre montada: se espera a que reciba el texto.
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        /Ajustamos la cantidad de Noir Intense[\s\S]*Ya no está disponible: Producto borrado/,
      ),
    );
    expect(refresh).toHaveBeenCalledWith(["noir-100", "gone"]);
    expect(useCart.getState().items).toHaveLength(1);

    const total = screen.getByText("Total estimado").parentElement as HTMLElement;
    expect(within(total).getByText("₲ 285.000")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /enviar pedido por whatsapp/i }).getAttribute("href"),
    ).toContain(encodeURIComponent("Total: ₲ 285.000"));
    expect(screen.getByText("Mensaje que vas a enviar")).toBeInTheDocument();
  });

  it("el aviso deduplica nombres y dura hasta que se cierra el drawer", async () => {
    const twin = item({ variantId: "noir-50", name: "Noir Intense", quantity: 2, maxStock: 2 });
    refresh.mockResolvedValue([
      snap("noir-100", { stock: 1 }),
      snap("noir-50", { stock: 1 }),
    ]);
    useCart.setState({ items: [noirQty3, twin], isOpen: true });
    const user = userEvent.setup();

    render(<CartDrawer />);

    const status = screen.getByRole("status");
    await waitFor(() =>
      expect(status.textContent).toBe("Ajustamos la cantidad de Noir Intense por stock."),
    );

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    // Con el <dialog> cerrado la región queda fuera del árbol accesible: se consulta con hidden.
    expect(screen.getByRole("status", { hidden: true })).toBeEmptyDOMElement();
  });

  it("carrito vacío: titular, enlace al catálogo y sin botón de WhatsApp", () => {
    useCart.setState({ items: [], isOpen: true });
    render(<CartDrawer />);

    expect(screen.getByRole("heading", { name: "Tu carrito está vacío" })).toBeInTheDocument();
    expect(screen.getByText("Mirá los productos y armá tu pedido.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver catálogo" })).toHaveAttribute("href", "/productos");
    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("si el ajuste vacía el carrito, el aviso explica por qué", async () => {
    refresh.mockResolvedValue([snap("v1", { available: false })]);
    useCart.setState({ items: [item({ name: "Cera" })], isOpen: true });

    render(<CartDrawer />);

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Ya no está disponible: Cera."),
    );
    expect(screen.getByRole("heading", { name: "Tu carrito está vacío" })).toBeInTheDocument();
  });

  it("un producto renombrado se actualiza en la lista y en el mensaje, sin aviso", async () => {
    refresh.mockResolvedValue([snap("v1", { name: "Cera mate", slug: "cera-mate", price: 100000 })]);
    useCart.setState({ items: [item({ name: "Cera" })], isOpen: true });

    render(<CartDrawer />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Quitar Cera mate" })).toBeInTheDocument());
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(
      screen.getByRole("link", { name: /enviar pedido por whatsapp/i }).getAttribute("href"),
    ).toContain(encodeURIComponent("1 × Cera mate"));
  });

  it("si el refresco falla conserva el carrito y no muestra avisos", async () => {
    refresh.mockRejectedValue(new Error("red caída"));
    useCart.setState({ items: [noirQty3, borrado], isOpen: true });

    render(<CartDrawer />);

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    await act(async () => {});
    expect(useCart.getState().items).toHaveLength(2);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByText("Producto borrado")).toBeInTheDocument();
  });

  it("muestra «Actualizando…» solo si el refresco tarda más de 300 ms", async () => {
    vi.useFakeTimers();
    let resolve: (value: VariantSnapshot[]) => void = () => {};
    refresh.mockReturnValue(new Promise((r) => (resolve = r)));
    useCart.setState({ items: [noirQty3], isOpen: true });

    render(<CartDrawer />);

    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.queryByText("Actualizando…")).not.toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText("Actualizando…")).toBeInTheDocument();

    await act(async () => {
      resolve([snap("noir-100", { price: 285000, stock: 3 })]);
    });
    expect(screen.queryByText("Actualizando…")).not.toBeInTheDocument();
  });

  it("el stepper respeta el stock máximo y mantiene el foco en el límite", async () => {
    refresh.mockResolvedValue([snap("v1", { stock: 2 })]);
    useCart.setState({ items: [item({ name: "Cera", quantity: 1, maxStock: 2 })], isOpen: true });
    const user = userEvent.setup();

    render(<CartDrawer />);

    const more = screen.getByRole("button", { name: "Aumentar cantidad de Cera" });
    const less = screen.getByRole("button", { name: "Disminuir cantidad de Cera" });
    expect(less).toHaveAttribute("aria-disabled", "true");

    await user.click(more);
    expect(useCart.getState().items[0].quantity).toBe(2);
    expect(more).toHaveAttribute("aria-disabled", "true");
    expect(more).toHaveFocus();

    await user.click(more);
    expect(useCart.getState().items[0].quantity).toBe(2);
    expect(more).toHaveFocus();

    await user.click(less);
    expect(useCart.getState().items[0].quantity).toBe(1);
  });

  it("«Quitar» saca la fila y el vacío aparece", async () => {
    refresh.mockResolvedValue([snap("v1")]);
    useCart.setState({ items: [item({ name: "Cera" })], isOpen: true });
    const user = userEvent.setup();

    render(<CartDrawer />);

    await user.click(screen.getByRole("button", { name: "Quitar Cera" }));
    expect(useCart.getState().items).toEqual([]);
    expect(screen.getByRole("heading", { name: "Tu carrito está vacío" })).toBeInTheDocument();
  });

  it("se abre con isOpen, se cierra con Cerrar y devuelve el foco al disparador", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button" onClick={() => useCart.getState().open()}>
          Abrir
        </button>
        <CartDrawer />
      </>,
    );
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    expect(dialog).not.toHaveAttribute("open");

    const trigger = screen.getByRole("button", { name: "Abrir" });
    await user.click(trigger);
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("heading", { name: "Carrito" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(dialog).not.toHaveAttribute("open");
    expect(useCart.getState().isOpen).toBe(false);
    expect(trigger).toHaveFocus();
  });

  it("cerrar con el fondo (clic sobre el <dialog>) actualiza el store", async () => {
    useCart.setState({ items: [], isOpen: true });
    const user = userEvent.setup();
    render(<CartDrawer />);
    const dialog = document.querySelector("dialog") as HTMLDialogElement;

    await user.click(dialog);
    expect(useCart.getState().isOpen).toBe(false);
    expect(dialog).not.toHaveAttribute("open");
  });
});
