"use server";

import { getVariantSnapshots } from "@/lib/products";
import type { VariantSnapshot } from "@/lib/types";

/**
 * Tope solo contra entradas absurdas. No recorta: una variante que falta en la respuesta cuenta
 * como borrada en el cliente, así que descartar ids haría perder ítems del carrito.
 */
const MAX_IDS = 500;

/**
 * Precio, stock y disponibilidad actuales de las variantes del carrito.
 * Solo lectura y sin auth: la usa el drawer para reconciliar un carrito guardado días atrás.
 * Las variantes que ya no existen no vuelven en la respuesta.
 */
export async function refreshCart(variantIds: string[]): Promise<VariantSnapshot[]> {
  // Una Server Action es un endpoint público: no se confía en la forma de la entrada.
  if (!Array.isArray(variantIds)) return [];
  const ids = [...new Set(variantIds.filter((id): id is string => typeof id === "string"))];
  // El cliente trata el error como fallo del refresco y deja el carrito intacto.
  if (ids.length > MAX_IDS) throw new Error("Demasiados ítems en el carrito");
  return getVariantSnapshots(ids);
}
