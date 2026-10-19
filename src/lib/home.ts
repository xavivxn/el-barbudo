import { CATEGORIES, type ProductDTO } from "@/lib/types";

export type CategoryGroup = {
  category: (typeof CATEGORIES)[number];
  products: ProductDTO[];
  /** Cuántos productos tiene la categoría en total, contando los excluidos y antes de recortar. */
  total: number;
};

/**
 * Secciones de la portada: en el orden de CATEGORIES, hasta `perSection` productos por sección.
 * `exclude` (ids) deja afuera lo que ya se mostró, por ejemplo en "Destacados"; la sección que
 * queda sin productos se omite.
 */
export function groupByCategory(
  products: ProductDTO[],
  perSection = 4,
  exclude: ReadonlySet<string> = new Set(),
): CategoryGroup[] {
  return CATEGORIES.flatMap((category) => {
    const inCategory = products.filter((product) => product.category === category.value);
    const shown = inCategory.filter((product) => !exclude.has(product.id)).slice(0, perSection);
    if (shown.length === 0) return [];
    return [{ category, products: shown, total: inCategory.length }];
  });
}
