import type { ProductDTO } from "@/lib/types";

/** Los destacados activos, en orden; si no hay ninguno, los primeros `max` productos. */
export function pickShowcase(products: ProductDTO[], max = 5): ProductDTO[] {
  const featured = products.filter((product) => product.featured && product.active);
  return (featured.length > 0 ? featured : products).slice(0, max);
}

/** Índice circular: -1 es el último, `n` es el primero. Con lista vacía, 0. */
export function wrapIndex(i: number, n: number): number {
  if (n <= 0) return 0;
  return ((i % n) + n) % n;
}
