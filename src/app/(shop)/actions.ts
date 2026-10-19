"use server";

import { getVariantSnapshots } from "@/lib/products";
import type { VariantSnapshot } from "@/lib/types";

/** Tope defensivo: un carrito real tiene un puñado de ítems. */
const MAX_IDS = 50;

/**
 * Precio, stock y disponibilidad actuales de las variantes del carrito.
 * Solo lectura y sin auth: la usa el drawer para reconciliar un carrito guardado días atrás.
 * Las variantes que ya no existen no vuelven en la respuesta.
 */
export async function refreshCart(variantIds: string[]): Promise<VariantSnapshot[]> {
  // Una Server Action es un endpoint público: no se confía en la forma de la entrada.
  if (!Array.isArray(variantIds)) return [];
  const ids = [...new Set(variantIds.filter((id): id is string => typeof id === "string"))].slice(
    0,
    MAX_IDS,
  );
  return getVariantSnapshots(ids);
}
