import { CATEGORIES } from "@/lib/types";

type CatalogParams = { categoria?: string; etiqueta?: string };
type CatalogChange = { categoria?: string | null; etiqueta?: string | null };

/**
 * Arma la URL del catálogo a partir de los filtros actuales y un cambio.
 * Un campo ausente en `change` se conserva; `null` lo quita.
 */
export function buildCatalogHref(current: CatalogParams, change: CatalogChange): string {
  const categoria = change.categoria === undefined ? current.categoria : change.categoria;
  const etiqueta = change.etiqueta === undefined ? current.etiqueta : change.etiqueta;

  const parts: string[] = [];
  if (categoria) parts.push(`categoria=${encodeURIComponent(categoria)}`);
  if (etiqueta) parts.push(`etiqueta=${encodeURIComponent(etiqueta)}`);
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
