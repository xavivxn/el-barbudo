import { CATEGORIES, type ProductDTO } from "@/lib/types";

export type CategoryGroup = {
  category: (typeof CATEGORIES)[number];
  products: ProductDTO[];
  /** Cuántos productos tiene la categoría en total, antes de recortar. */
  total: number;
};

/** Secciones de la portada: en el orden de CATEGORIES, sin categorías vacías, `perSection` por sección. */
export function groupByCategory(products: ProductDTO[], perSection = 4): CategoryGroup[] {
  return CATEGORIES.flatMap((category) => {
    const inCategory = products.filter((product) => product.category === category.value);
    if (inCategory.length === 0) return [];
    return [{ category, products: inCategory.slice(0, perSection), total: inCategory.length }];
  });
}
