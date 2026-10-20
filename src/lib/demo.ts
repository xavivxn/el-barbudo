import { isDemoMode } from "@/lib/env-check";

/**
 * `true` si la tienda corre como demo (ver `isDemoMode`). Se lee una vez, al cargar el módulo.
 *
 * Solo para el servidor: nunca importarlo desde un componente de cliente, donde `process.env.DEMO_MODE`
 * no existe y siempre daría `true`.
 */
export const DEMO_MODE = isDemoMode(process.env);
