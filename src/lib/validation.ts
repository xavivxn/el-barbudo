import { z } from "zod";
import { isHttpsUrl, parsePrice, parseStock, PRICE_ERROR, STOCK_ERROR } from "@/lib/admin-messages";
import { CATEGORIES, type Category, type Notes } from "@/lib/types";

/** "Ácido & Cítrico" -> "acido-citrico". Sin tildes ni símbolos, con guiones simples. */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const MSG = {
  name: "Escribí el nombre del producto.",
  slug: "Escribí la dirección del producto.",
  slugFormat: "Usá solo letras minúsculas, números y guiones.",
  subtitle: "Escribí un subtítulo corto.",
  description: "Escribí la descripción del producto.",
  category: "Elegí una categoría.",
  label: "Escribí el tamaño o presentación.",
  price: PRICE_ERROR,
  stock: STOCK_ERROR,
  variants: "Agregá al menos una variante.",
  images: "Cada foto tiene que ser una URL que empiece con https://",
  notes: "Completá las tres notas o dejalas todas vacías.",
  serviceName: "Escribí el nombre del servicio.",
} as const;

const tooLong = (max: number) => `Escribí hasta ${max} caracteres.`;

/** Texto obligatorio: recorta espacios; vacío usa `empty`. */
function required(empty: string, max: number) {
  return z
    .string({ error: empty })
    .trim()
    .min(1, empty)
    .max(max, tooLong(max));
}

/** Texto que puede venir ausente o con espacios. */
const text = z.string().default("").transform((value) => value.trim());

const lines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

/** Número escrito como lo escribe el admin (`285.000`, ` 285 000 `), validado por `parse`. */
function amount(message: string, parse: (input: string) => number | null) {
  return z.string({ error: message }).transform((value, ctx) => {
    const parsed = parse(value);
    if (parsed === null) {
      ctx.issues.push({ code: "custom", message, input: value });
      return z.NEVER;
    }
    return parsed;
  });
}

/** Campo oculto numérico: si falta o no se entiende queda `undefined` (y se escribe siempre). */
const optionalAmount = (parse: (input: string) => number | null) =>
  z
    .string()
    .optional()
    .transform((value) => (value ? (parse(value) ?? undefined) : undefined));

const variantSchema = z.object({
  // El formulario manda "" para las variantes nuevas.
  id: z
    .string()
    .optional()
    .transform((id) => (id ? id : undefined)),
  label: required(MSG.label, 60),
  price: amount(MSG.price, parsePrice),
  stock: amount(MSG.stock, parseStock),
  // Lo que el formulario leyó al abrirse: permite no pisar cambios hechos después en otro lado.
  origPrice: optionalAmount(parsePrice),
  origStock: optionalAmount(parseStock),
});

const imagesSchema = text.transform((value, ctx) => {
  const urls = lines(value);
  if (!urls.every(isHttpsUrl)) {
    ctx.issues.push({ code: "custom", message: MSG.images, input: value });
    return z.NEVER;
  }
  return urls;
});

const tagsSchema = text.transform((value) => [
  ...new Set(
    value
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  ),
]);

const flag = z
  .union([z.boolean(), z.string()])
  .default(false)
  .transform((value) => value === true || value === "on" || value === "true");

const categoryValues = CATEGORIES.map((category) => category.value) as [Category, ...Category[]];

/**
 * Recibe los campos del formulario como texto y produce lo que se guarda.
 * Las notas solo cuentan en perfumes y los beneficios solo en el resto: lo que llegue de la otra
 * categoría se ignora aunque esté en el envío.
 */
export const productSchema = z
  .object({
    name: required(MSG.name, 120),
    slug: required(MSG.slug, 120).refine((slug) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug), {
      error: MSG.slugFormat,
    }),
    subtitle: required(MSG.subtitle, 120),
    category: z.enum(categoryValues, { error: MSG.category }),
    description: required(MSG.description, 3000),
    notes: z
      .object({ top: text, heart: text, base: text })
      .default({ top: "", heart: "", base: "" }),
    benefits: text,
    tags: tagsSchema,
    images: imagesSchema,
    featured: flag,
    active: flag,
    variants: z.array(variantSchema).min(1, MSG.variants),
    /** Ids de las variantes que el formulario tenía al abrirse: solo esas se pueden borrar. */
    loadedVariantIds: text.transform((value) =>
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.category !== "perfume") return;
    const filled = [data.notes.top, data.notes.heart, data.notes.base].filter(Boolean).length;
    if (filled > 0 && filled < 3) {
      ctx.addIssue({ code: "custom", path: ["notes"], message: MSG.notes });
    }
  })
  .transform((data) => {
    const isPerfume = data.category === "perfume";
    const filled = data.notes.top && data.notes.heart && data.notes.base;
    const notes: Notes | null = isPerfume && filled ? { ...data.notes } : null;
    return {
      ...data,
      notes,
      benefits: isPerfume ? [] : lines(data.benefits),
    };
  });

export type ProductInput = z.output<typeof productSchema>;

/**
 * Servicio de la barbería. El precio sigue la misma regla que el de las variantes (`parsePrice`) y
 * el orden es un entero de 0 en adelante (`parseStock` ya es esa regla).
 */
export const serviceSchema = z.object({
  name: required(MSG.serviceName, 120),
  description: text.refine((value) => value.length <= 500, { error: tooLong(500) }),
  price: amount(PRICE_ERROR, parsePrice),
  order: amount(STOCK_ERROR, parseStock),
});

export type ServiceInput = z.output<typeof serviceSchema>;

/** Primer mensaje por campo; las claves siguen el nombre del campo (`variants.0.price`). */
export function fieldErrors(
  result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } },
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (result.success || !result.error) return errors;
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join(".");
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

const SCALAR_FIELDS = ["name", "slug", "subtitle", "category", "description", "benefits", "tags", "images"] as const;
const NOTE_FIELDS = ["top", "heart", "base"] as const;
const VARIANT_FIELDS = ["id", "label", "price", "stock", "origPrice", "origStock"] as const;

const str = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");

/**
 * Convierte los nombres planos del formulario (`variants.0.price`, `notes.top`) en la forma que
 * espera `productSchema`. Solo lee los campos conocidos; todo lo demás se ignora.
 */
export function parseProductForm(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of SCALAR_FIELDS) result[field] = str(formData.get(field));

  result.notes = Object.fromEntries(NOTE_FIELDS.map((field) => [field, str(formData.get(`notes.${field}`))]));
  result.loadedVariantIds = str(formData.get("loadedVariantIds"));
  result.featured = formData.get("featured") === "on";
  result.active = formData.get("active") === "on";

  const byIndex = new Map<number, Record<string, string>>();
  for (const [key, value] of formData.entries()) {
    const match = /^variants\.(\d+)\.(id|label|price|stock|origPrice|origStock)$/.exec(key);
    if (!match || typeof value !== "string") continue;
    const index = Number(match[1]);
    const row = byIndex.get(index) ?? Object.fromEntries(VARIANT_FIELDS.map((f) => [f, ""]));
    row[match[2]] = value;
    byIndex.set(index, row);
  }
  result.variants = [...byIndex.entries()].sort(([a], [b]) => a - b).map(([, row]) => row);
  return result;
}

/** Campos del formulario de servicio como texto; lo que no se conoce se ignora. */
export function parseServiceForm(formData: FormData): Record<string, string> {
  return {
    name: str(formData.get("name")),
    description: str(formData.get("description")),
    price: str(formData.get("price")),
    order: str(formData.get("order")) || "0",
  };
}
