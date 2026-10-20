import { isSoldOut, minPrice } from "@/lib/stock";
import { CATEGORIES, type ProductDTO } from "@/lib/types";

/** Órdenes del catálogo (`?orden=`). El primero es el de siempre: destacados y luego más nuevos. */
export const SORT_OPTIONS = [
  { value: "destacados", label: "Destacados" },
  { value: "precio-asc", label: "Menor precio" },
  { value: "precio-desc", label: "Mayor precio" },
  { value: "nombre", label: "Nombre" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];
export const DEFAULT_SORT: SortKey = "destacados";

/** Un valor desconocido o ausente es el orden por defecto. */
export function sortFromParam(value: string | undefined): SortKey {
  return SORT_OPTIONS.some((option) => option.value === value) ? (value as SortKey) : DEFAULT_SORT;
}

/** Precio con el que se ordena: el menor de las variantes con stock; agotado, el menor de todas. */
function sortPrice(product: ProductDTO): number {
  const available = product.variants.filter((variant) => variant.stock > 0);
  return minPrice(available.length > 0 ? available : product.variants);
}

/**
 * Ordena una copia. "destacados" devuelve la lista tal cual (ya viene de la base en ese orden). En
 * los órdenes por precio los agotados van al final; el orden es estable (empates quedan como venían).
 */
export function sortProducts(products: ProductDTO[], orden: SortKey): ProductDTO[] {
  if (orden === "destacados") return products;
  const sorted = products.slice();
  if (orden === "nombre") {
    return sorted.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  }
  const direction = orden === "precio-asc" ? 1 : -1;
  return sorted.sort((a, b) => {
    const soldOut = Number(isSoldOut(a.variants)) - Number(isSoldOut(b.variants));
    if (soldOut !== 0) return soldOut;
    if (a.variants.length === 0 || b.variants.length === 0) return b.variants.length - a.variants.length;
    return (sortPrice(a) - sortPrice(b)) * direction;
  });
}

type CatalogParams = { categoria?: string; etiqueta?: string; orden?: string };
type CatalogChange = { categoria?: string | null; etiqueta?: string | null; orden?: string | null };

/**
 * Arma la URL del catálogo a partir de los filtros actuales y un cambio.
 * Un campo ausente en `change` se conserva; `null` lo quita. El orden por defecto no va en la URL.
 */
export function buildCatalogHref(current: CatalogParams, change: CatalogChange): string {
  const categoria = change.categoria === undefined ? current.categoria : change.categoria;
  const etiqueta = change.etiqueta === undefined ? current.etiqueta : change.etiqueta;
  const orden = change.orden === undefined ? current.orden : change.orden;

  const parts: string[] = [];
  if (categoria) parts.push(`categoria=${encodeURIComponent(categoria)}`);
  if (etiqueta) parts.push(`etiqueta=${encodeURIComponent(etiqueta)}`);
  if (orden && orden !== DEFAULT_SORT) parts.push(`orden=${encodeURIComponent(orden)}`);
  return parts.length > 0 ? `/productos?${parts.join("&")}` : "/productos";
}

/** Next entrega `string | string[] | undefined`: se toma el primer valor. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Un slug desconocido o ausente devuelve `undefined`: el catálogo no filtra. */
export function categoryFromSlug(slug: string | undefined) {
  return CATEGORIES.find((category) => category.slug === slug);
}
