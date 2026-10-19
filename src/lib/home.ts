import { CATEGORIES, type ProductDTO } from "@/lib/types";

export type CategoryGroup = {
  category: (typeof CATEGORIES)[number];
  products: ProductDTO[];
  /** Cuántos productos tiene la categoría en total, contando los excluidos y antes de recortar. */
  total: number;
};

/**
 * Secciones de la portada: en el orden de CATEGORIES, hasta `perSection` productos por sección.
 * `exclude` (ids) deja afuera lo que ya se mostró, por ejemplo en la vitrina. Si excluir deja vacía
 * una categoría que sí tiene productos, se muestran los suyos sin excluir: la pestaña nunca
 * desaparece por la vitrina. Solo se omite la categoría sin ningún producto.
 */
export function groupByCategory(
  products: ProductDTO[],
  perSection = 4,
  exclude: ReadonlySet<string> = new Set(),
): CategoryGroup[] {
  return CATEGORIES.flatMap((category) => {
    const inCategory = products.filter((product) => product.category === category.value);
    if (inCategory.length === 0) return [];
    const remaining = inCategory.filter((product) => !exclude.has(product.id));
    const shown = (remaining.length > 0 ? remaining : inCategory).slice(0, perSection);
    return [{ category, products: shown, total: inCategory.length }];
  });
}
