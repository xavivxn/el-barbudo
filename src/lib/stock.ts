export function isSoldOut(variants: { stock: number }[]): boolean {
  return variants.every((variant) => variant.stock <= 0);
}

export function clampQuantity(requested: number, stock: number): number {
  if (stock <= 0) return 0;
  const wanted = Number.isFinite(requested) ? Math.floor(requested) : 1;
  return Math.min(Math.max(wanted, 1), stock);
}

export function minPrice(variants: { price: number }[]): number {
  return Math.min(...variants.map((variant) => variant.price));
}
