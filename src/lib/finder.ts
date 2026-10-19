import { isSoldOut } from "@/lib/stock";
import type { ProductDTO } from "@/lib/types";

export type FinderQuery = { moment?: "día" | "noche"; styles: string[] };

/** Disponibles primero, agotados al final; el orden previo se mantiene (el sort es estable). */
function availableFirst(products: ProductDTO[]): ProductDTO[] {
  return [...products].sort((a, b) => Number(isSoldOut(a.variants)) - Number(isSoldOut(b.variants)));
}

export function matchFragrances(
  products: ProductDTO[],
  q: FinderQuery,
): { exact: boolean; results: ProductDTO[] } {
  const perfumes = products.filter((product) => product.category === "perfume");

  // Sin elección: todos los perfumes. Los destacados van al final de cada grupo porque ya están en
  // la vitrina; los disponibles siguen primero.
  if (!q.moment && q.styles.length === 0) {
    const featuredLast = [...perfumes].sort((a, b) => Number(a.featured) - Number(b.featured));
    return { exact: true, results: availableFirst(featuredLast) };
  }

  const scored = perfumes.map((product) => {
    const momentMatch = q.moment ? product.tags.includes(q.moment) : false;
    const styleMatches = q.styles.filter((style) => product.tags.includes(style)).length;
    return {
      product,
      score: (momentMatch ? 1 : 0) + styleMatches,
      exact: (!q.moment || momentMatch) && styleMatches === q.styles.length,
    };
  });

  const exact = scored.filter((entry) => entry.exact);
  if (exact.length > 0) {
    return { exact: true, results: availableFirst(exact.map((entry) => entry.product)) };
  }

  const partial = scored.filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);
  if (partial.length > 0) {
    return { exact: false, results: availableFirst(partial.map((entry) => entry.product)) };
  }

  return { exact: false, results: availableFirst(perfumes) };
}
