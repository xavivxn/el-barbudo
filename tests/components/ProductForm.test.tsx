import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductForm } from "@/components/admin/ProductForm";
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

const saveProduct = vi.hoisted(() => vi.fn());
vi.mock("@/app/admin/actions", () => ({ saveProduct }));

afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  saveProduct.mockResolvedValue({});
});

const existing: ProductDTO = {
  id: "p1",
  slug: "bleu-de-chanel",
  name: "Bleu de Chanel",
  subtitle: "Eau de parfum",
  category: "perfume",
  description: "Aromático.",
  notes: { top: "Pomelo", heart: "Jengibre", base: "Cedro" },
  benefits: [],
  tags: ["amaderado", "noche"],
  images: ["https://x.com/a.jpg"],
  featured: true,
  active: true,
  variants: [
    { id: "v1", label: "50 ml", price: 150000, stock: 2 },
    { id: "v2", label: "100 ml", price: 285000, stock: 4 },
  ],
};

const field = (name: RegExp | string) => screen.getByRole("textbox", { name });

describe("ProductForm", () => {
  it("la dirección se genera con el nombre hasta que se edita a mano", async () => {
    const user = userEvent.setup();
    render(<ProductForm />);
    await user.type(field("Nombre"), "Ácido & Cítrico");
    expect(field(/^Dirección/)).toHaveValue("acido-citrico");

    await user.clear(field(/^Dirección/));
    await user.type(field(/^Dirección/), "mi-direccion");
    await user.type(field("Nombre"), " Extra");
    expect(field(/^Dirección/)).toHaveValue("mi-direccion");
  });

  it("al editar no pisa la dirección existente", async () => {
    const user = userEvent.setup();
    render(<ProductForm product={existing} />);
    await user.type(field("Nombre"), " 2");
    expect(field(/^Dirección/)).toHaveValue("bleu-de-chanel");
  });

  it("notas y beneficios se muestran según la categoría y lo oculto no se envía", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProductForm />);
    expect(screen.getByRole("group", { name: "Notas olfativas" })).toBeEnabled();
    expect(screen.queryByRole("group", { name: "Ingredientes o beneficios" })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Categoría"), "barba");
    expect(screen.queryByRole("group", { name: "Notas olfativas" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Ingredientes o beneficios" })).toBeEnabled();

    // Los campos ocultos quedan deshabilitados: el navegador no los incluye en el envío.
    const hidden = container.querySelector<HTMLElement>("input[name='notes.top']")!;
    expect(hidden.closest("fieldset")).toBeDisabled();
    expect(new FormData(container.querySelector("form")!).has("notes.top")).toBe(false);
  });

  it("agrega y quita variantes, y no deja quitar la última", async () => {
    const user = userEvent.setup();
    render(<ProductForm />);
    expect(screen.getByRole("button", { name: "Quitar variante 1" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Agregar variante" }));
    expect(screen.getAllByRole("group", { name: /^Variante \d$/ })).toHaveLength(2);
    expect(screen.getAllByLabelText("Tamaño o presentación")[1]).toHaveFocus();

    await user.type(screen.getAllByLabelText("Tamaño o presentación")[1], "200 ml");
    await user.click(screen.getByRole("button", { name: "Quitar variante 1" }));
    expect(screen.getAllByRole("group", { name: /^Variante \d$/ })).toHaveLength(1);
    expect(screen.getByLabelText("Tamaño o presentación")).toHaveValue("200 ml");
    expect(screen.getByLabelText("Tamaño o presentación")).toHaveAttribute("name", "variants.0.label");
  });

  it("las variantes existentes llevan su id oculto y el precio con puntos", () => {
    const { container } = render(<ProductForm product={existing} />);
    const ids = [...container.querySelectorAll<HTMLInputElement>("input[type='hidden']")].map((i) => [i.name, i.value]);
    expect(ids).toContainEqual(["productId", "p1"]);
    expect(ids).toContainEqual(["variants.0.id", "v1"]);
    expect(ids).toContainEqual(["variants.1.id", "v2"]);
    // Lo que el formulario leyó al abrirse, para no pisar cambios hechos después.
    expect(ids).toContainEqual(["loadedVariantIds", "v1,v2"]);
    expect(ids).toContainEqual(["variants.0.origPrice", "150000"]);
    expect(ids).toContainEqual(["variants.0.origStock", "2"]);
    expect(ids).toContainEqual(["variants.1.origPrice", "285000"]);
    expect(ids).toContainEqual(["variants.1.origStock", "4"]);
    expect(screen.getAllByLabelText("Precio (₲)")[1]).toHaveValue("285.000");
  });

  it("valida al salir de cada campo con los mensajes del servidor", async () => {
    const user = userEvent.setup();
    render(<ProductForm />);
    await user.click(field("Nombre"));
    await user.tab();
    expect(screen.getByText("Escribí el nombre del producto.")).toBeInTheDocument();
    expect(field("Nombre")).toHaveAttribute("aria-invalid", "true");
    expect(field("Nombre").getAttribute("aria-describedby")).toContain("name-error");

    // Al corregirlo, el error se va mientras escribe.
    // Los errores de blur van solo junto al campo: el resumen es para el envío.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.type(field("Nombre"), "Aceite");
    expect(screen.queryByText("Escribí el nombre del producto.")).not.toBeInTheDocument();

    const price = screen.getByLabelText("Precio (₲)");
    await user.type(price, "12,5");
    await user.tab();
    expect(screen.getByText("Ingresá un precio en guaraníes, sin decimales.")).toBeInTheDocument();
  });

  it("normaliza el precio con puntos al salir del campo", async () => {
    const user = userEvent.setup();
    render(<ProductForm />);
    await user.type(screen.getByLabelText("Precio (₲)"), "285000");
    await user.tab();
    expect(screen.getByLabelText("Precio (₲)")).toHaveValue("285.000");
  });

  it("envía los nombres planos que espera parseProductForm", async () => {
    const user = userEvent.setup();
    render(<ProductForm product={existing} />);
    await user.click(screen.getByRole("button", { name: "Guardar producto" }));
    expect(saveProduct).toHaveBeenCalledTimes(1);
    const data = saveProduct.mock.calls[0][1] as FormData;
    expect(data.get("productId")).toBe("p1");
    expect(data.get("slug")).toBe("bleu-de-chanel");
    expect(data.get("variants.1.price")).toBe("285.000");
    expect(data.get("variants.1.id")).toBe("v2");
    expect(data.get("variants.1.origStock")).toBe("4");
    expect(data.get("loadedVariantIds")).toBe("v1,v2");
    expect(data.get("notes.top")).toBe("Pomelo");
    expect(data.get("tags")).toBe("amaderado, noche");
    expect(data.get("featured")).toBe("on");
    expect(data.get("active")).toBe("on");
  });

  it("con errores del servidor muestra el resumen con enlaces y conserva lo escrito", async () => {
    saveProduct.mockResolvedValue({
      errors: {
        name: "Escribí el nombre del producto.",
        "variants.0.price": "Ingresá un precio en guaraníes, sin decimales.",
        slug: "Ya existe un producto con esta dirección.",
      },
    });
    const user = userEvent.setup();
    render(<ProductForm />);
    await user.type(field(/^Dirección/), "repetida");
    await user.click(screen.getByRole("button", { name: "Guardar producto" }));

    const summary = await screen.findByRole("alert");
    expect(summary).toHaveFocus();
    expect(within(summary).getByText("Hay 3 campos para revisar")).toBeInTheDocument();
    const links = within(summary).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "#name",
      "#slug",
      "#variants-0-price",
    ]);
    expect(within(summary).getByRole("link", { name: /Variante 1, precio/ })).toBeInTheDocument();

    expect(field(/^Dirección/)).toHaveValue("repetida");
    expect(field(/^Dirección/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Ya existe un producto con esta dirección.")).toHaveAttribute("id", "slug-error");

    await user.click(within(summary).getByRole("link", { name: /Nombre/ }));
    expect(field("Nombre")).toHaveFocus();
  });

  it("el resumen del envío solo cuenta los errores sin corregir y no suma los de blur", async () => {
    saveProduct.mockResolvedValue({
      errors: { name: "Escribí el nombre del producto.", subtitle: "Escribí un subtítulo corto." },
    });
    const user = userEvent.setup();
    render(<ProductForm />);
    await user.click(screen.getByRole("button", { name: "Guardar producto" }));
    const summary = await screen.findByRole("alert");
    expect(within(summary).getByText("Hay 2 campos para revisar")).toBeInTheDocument();

    await user.type(field("Nombre"), "Aceite");
    await user.click(field("Descripción"));
    await user.tab();
    // La descripción vacía muestra su error junto al campo, pero no entra al resumen.
    expect(screen.getByText("Escribí la descripción del producto.")).toBeInTheDocument();
    const after = screen.getByRole("alert");
    expect(within(after).getByText("Hay 1 campo para revisar")).toBeInTheDocument();
    expect(within(after).queryByText(/descripción/i)).not.toBeInTheDocument();
  });

  it("un error general sin campos se muestra en el resumen", async () => {
    saveProduct.mockResolvedValue({ message: "No pudimos guardar el producto. Probá de nuevo." });
    const user = userEvent.setup();
    render(<ProductForm />);
    await user.click(screen.getByRole("button", { name: "Guardar producto" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar el producto. Probá de nuevo.");
  });

  it("muestra miniaturas de las fotos válidas", async () => {
    const user = userEvent.setup();
    render(<ProductForm />);
    await user.type(
      screen.getByLabelText(/Direcciones de las fotos/),
      "https://x.com/a.jpg{Enter}http://inseguro.com/b.jpg{Enter}https://y.com/c.jpg",
    );
    const preview = await screen.findByRole("list", { name: "Vista previa de las fotos" });
    expect(within(preview).getAllByRole("img")).toHaveLength(2);
  });

  it("los dos interruptores de visibilidad tienen texto visible", async () => {
    render(<ProductForm />);
    expect(screen.getByRole("checkbox", { name: /Destacado/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Activo/ })).toBeChecked();
  });
});
