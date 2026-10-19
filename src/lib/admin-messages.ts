import { parseGuaranies } from "@/lib/money";

/**
 * Reglas y mensajes de precio, stock y fotos del admin. Sin dependencias pesadas (nada de zod):
 * las comparten el esquema, las Server Actions, la edición en línea y el formulario.
 */
export const PRICE_ERROR = "Ingresá un precio en guaraníes, sin decimales.";
export const STOCK_ERROR = "Ingresá un número entero, 0 o más.";

/** Precio en guaraníes: entero de 1 en adelante, escrito como lo escribe el admin. */
export function parsePrice(input: unknown): number | null {
  if (typeof input !== "string") return null;
  const value = parseGuaranies(input);
  return value !== null && value >= 1 ? value : null;
}

/** Stock: entero de 0 en adelante. */
export function parseStock(input: unknown): number | null {
  return typeof input === "string" ? parseGuaranies(input) : null;
}

/** URL https:// con host. Una sola definición para el servidor y la vista previa. */
export function isHttpsUrl(value: string): boolean {
  if (!value.startsWith("https://")) return false;
  try {
    return new URL(value).hostname !== "";
  } catch {
    return false;
  }
}
