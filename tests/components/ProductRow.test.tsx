import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductRow } from "@/components/admin/ProductRow";
import type { ProductDTO } from "@/lib/types";

type MockImageProps = ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean };

vi.mock("next/image", () => ({
  default: (props: MockImageProps) => {
    const img = { ...props };
    delete img.fill;
    delete img.unoptimized;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...img} alt={img.alt ?? ""} />;
  },
}));

const actions = vi.hoisted(() => ({
  updateVariant: vi.fn(),
  markSoldOut: vi.fn(),
  toggleProductFlag: vi.fn(),
}));
vi.mock("@/app/admin/actions", () => actions);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  vi.resetAllMocks();
  actions.updateVariant.mockResolvedValue({ ok: true });
  actions.markSoldOut.mockResolvedValue({ ok: true });
  actions.toggleProductFlag.mockResolvedValue(undefined);
});

function product(over: Partial<ProductDTO> = {}): ProductDTO {
  return {
    id: "p1",
    slug: "bleu",
    name: "Bleu de Chanel",
    subtitle: "Eau de parfum",
    category: "perfume",
    description: "",
    notes: null,
    benefits: [],
    tags: [],
    images: [],
    featured: false,
    active: true,
    variants: [
      { id: "v1", label: "100 ml", price: 285000, stock: 4 },
      { id: "v2", label: "50 ml", price: 150000, stock: 2 },
    ],
    ...over,
  };
}

const renderRow = (over?: Partial<ProductDTO>) =>
  render(
    <ul>
      <ProductRow product={product(over)} />
    </ul>,
  );

function field(variantLabel: string, name: "Precio" | "Stock") {
  const group = screen.getByRole("group", { name: `Bleu de Chanel, ${variantLabel}` });
  return group.querySelector<HTMLInputElement>(`input[id$="-${name === "Precio" ? "price" : "stock"}"]`)!;
}

describe("ProductRow", () => {
  it("muestra el precio con puntos de miles y etiquetas visibles", () => {
    renderRow();
    expect(field("100 ml", "Precio")).toHaveValue("285.000");
    expect(field("100 ml", "Stock")).toHaveValue("4");
    expect(screen.getAllByText("Precio")).toHaveLength(2);
    expect(screen.getByLabelText("Precio", { selector: "#" + field("100 ml", "Precio").id })).toBe(field("100 ml", "Precio"));
    expect(field("100 ml", "Precio")).toHaveAttribute("inputmode", "numeric");
  });

  it("guarda al perder el foco, normaliza el valor y muestra Guardado", async () => {
    const user = userEvent.setup();
    renderRow();
    const price = field("100 ml", "Precio");
    await user.clear(price);
    await user.type(price, "350000");
    await user.tab();
    expect(actions.updateVariant).toHaveBeenCalledWith("v1", { price: "350000" });
    expect(price).toHaveValue("350.000");
    expect(await screen.findByText("Guardado")).toBeInTheDocument();
  });

  it("guarda con Enter y no vuelve a guardar al salir del campo", async () => {
    const user = userEvent.setup();
    renderRow();
    const stock = field("100 ml", "Stock");
    await user.clear(stock);
    await user.type(stock, "0{Enter}");
    await user.tab();
    await waitFor(() => expect(actions.updateVariant).toHaveBeenCalledTimes(1));
    expect(actions.updateVariant).toHaveBeenCalledWith("v1", { stock: "0" });
  });

  it("acepta lo que el admin escribe de más maneras", async () => {
    const user = userEvent.setup();
    renderRow();
    const price = field("100 ml", "Precio");
    await user.clear(price);
    await user.type(price, " 300 000 ");
    await user.tab();
    expect(actions.updateVariant).toHaveBeenCalledWith("v1", { price: "300000" });
  });

  it("no guarda si el valor no cambió", async () => {
    const user = userEvent.setup();
    renderRow();
    await user.click(field("100 ml", "Precio"));
    await user.tab();
    expect(actions.updateVariant).not.toHaveBeenCalled();
    // Mismo número escrito sin puntos: tampoco cuenta como cambio.
    const price = field("100 ml", "Precio");
    await user.clear(price);
    await user.type(price, "285000");
    await user.tab();
    expect(actions.updateVariant).not.toHaveBeenCalled();
    expect(price).toHaveValue("285.000");
  });

  it.each([
    ["Precio", "-5", "Ingresá un precio en guaraníes, sin decimales."],
    ["Precio", "12,5", "Ingresá un precio en guaraníes, sin decimales."],
    ["Precio", "", "Ingresá un precio en guaraníes, sin decimales."],
    ["Stock", "1,5", "Ingresá un número entero, 0 o más."],
    ["Stock", "-1", "Ingresá un número entero, 0 o más."],
  ] as const)("%s %j muestra el error junto al campo y no guarda", async (name, typed, message) => {
    const user = userEvent.setup();
    renderRow();
    const input = field("100 ml", name);
    await user.clear(input);
    if (typed) await user.type(input, typed);
    await user.tab();
    expect(actions.updateVariant).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent(message);
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
  });

  it("muestra el error del servidor y deja el valor escrito", async () => {
    actions.updateVariant.mockResolvedValue({ error: "No encontramos esta variante. Recargá la página." });
    const user = userEvent.setup();
    renderRow();
    const stock = field("50 ml", "Stock");
    await user.clear(stock);
    await user.type(stock, "9");
    await user.tab();
    expect(await screen.findByRole("alert")).toHaveTextContent("No encontramos esta variante");
    expect(stock).toHaveAttribute("aria-invalid", "true");
    expect(stock).toHaveValue("9");
  });

  it("Escape vuelve al valor guardado", async () => {
    const user = userEvent.setup();
    renderRow();
    const stock = field("100 ml", "Stock");
    await user.clear(stock);
    await user.type(stock, "99{Escape}");
    expect(stock).toHaveValue("4");
    expect(actions.updateVariant).not.toHaveBeenCalled();
  });

  it("muestra Guardando… mientras espera y Guardado se va a los 2 segundos", async () => {
    let finish!: (value: { ok: true }) => void;
    actions.updateVariant.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    renderRow();
    const stock = field("100 ml", "Stock");
    await user.clear(stock);
    await user.type(stock, "7");
    await user.tab();
    expect(screen.getByText("Guardando…")).toBeInTheDocument();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    await act(async () => finish({ ok: true }));
    expect(screen.getByText("Guardado")).toBeInTheDocument();
    await act(async () => void vi.advanceTimersByTime(2100));
    expect(screen.queryByText("Guardado")).not.toBeInTheDocument();
  });

  it("los interruptores son switches con nombre visible y mandan el valor deseado", async () => {
    const user = userEvent.setup();
    renderRow({ featured: false, active: true });
    const featured = screen.getByRole("switch", { name: "Destacado" });
    const active = screen.getByRole("switch", { name: "Activo" });
    expect(featured).toHaveAttribute("aria-checked", "false");
    expect(active).toHaveAttribute("aria-checked", "true");
    await user.click(featured);
    expect(actions.toggleProductFlag).toHaveBeenCalledWith("p1", "featured", true);
    await user.click(active);
    expect(actions.toggleProductFlag).toHaveBeenCalledWith("p1", "active", false);
  });

  it("al guardar el interruptor cambia al instante, conserva el foco y solo él queda pendiente", async () => {
    let finish!: () => void;
    actions.toggleProductFlag.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    renderRow({ featured: false, active: true });
    const featured = screen.getByRole("switch", { name: "Destacado" });
    const active = screen.getByRole("switch", { name: "Activo" });

    await user.click(featured);
    expect(featured).toHaveAttribute("aria-checked", "true");
    expect(featured).toHaveAttribute("aria-disabled", "true");
    expect(featured).not.toBeDisabled();
    expect(featured).toHaveFocus();
    expect(active).not.toHaveAttribute("aria-disabled");

    // Un segundo clic mientras guarda no manda otro pedido.
    await user.click(featured);
    expect(actions.toggleProductFlag).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    expect(featured).toHaveFocus();
  });

  it("Marcar agotado pide confirmación y luego llama a la action", async () => {
    const user = userEvent.setup();
    renderRow();
    await user.click(screen.getByRole("button", { name: "Marcar agotado" }));
    expect(actions.markSoldOut).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(actions.markSoldOut).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Marcar agotado" }));
    await user.click(screen.getByRole("button", { name: "Sí, marcar agotado" }));
    expect(actions.markSoldOut).toHaveBeenCalledWith("p1");
  });

  it("el foco vuelve a Marcar agotado al cancelar y al confirmar", async () => {
    const user = userEvent.setup();
    renderRow();
    await user.click(screen.getByRole("button", { name: "Marcar agotado" }));
    expect(screen.getByRole("button", { name: "Sí, marcar agotado" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("button", { name: "Marcar agotado" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Marcar agotado" }));
    await user.click(screen.getByRole("button", { name: "Sí, marcar agotado" }));
    expect(document.activeElement).toBe(document.getElementById("p1-sold-out"));
    expect(document.activeElement).not.toBe(document.body);
  });

  it("con todo el stock en 0 el botón queda desactivado y se avisa", () => {
    renderRow({
      variants: [{ id: "v1", label: "100 ml", price: 285000, stock: 0 }],
    });
    const button = screen.getByRole("button", { name: "Marcar agotado" });
    // aria-disabled y no disabled: sigue enfocable, así el foco no se pierde.
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    expect(screen.getByText(/Agotado/)).toBeInTheDocument();
  });

  it("con todo agotado, activar Marcar agotado no hace nada", async () => {
    const user = userEvent.setup();
    renderRow({ variants: [{ id: "v1", label: "100 ml", price: 285000, stock: 0 }] });
    await user.click(screen.getByRole("button", { name: "Marcar agotado" }));
    expect(screen.queryByRole("button", { name: "Sí, marcar agotado" })).not.toBeInTheDocument();
  });

  it("un producto inactivo lo dice", () => {
    renderRow({ active: false });
    expect(screen.getByText(/Oculto en la tienda/)).toBeInTheDocument();
  });

  it("el nombre enlaza a la edición", () => {
    renderRow();
    expect(screen.getByRole("link", { name: "Bleu de Chanel" })).toHaveAttribute("href", "/admin/productos/p1");
  });
});
