/**
 * Comprobación de variables de entorno al hacer el build de producción (la llama `next.config.ts`).
 *
 * Sin `NEXT_PUBLIC_WHATSAPP_NUMBER`, los pedidos van al número de respaldo de `src/site.ts`; igual
 * el build de producción exige la variable (y que no sea el marcador de `.env.example`) para que el
 * número del local se configure a propósito. Los mensajes nombran la variable, nunca su valor.
 *
 * Sin imports: `next.config.ts` lo carga antes de que existan los alias `@/`.
 */

/** Número de ejemplo de `.env.example`. No es un número real (hay un test que lo alinea). */
export const PLACEHOLDER_WHATSAPP_NUMBER = "595000000000";

type Env = Record<string, string | undefined>;

/**
 * Modo demo: la tienda funciona sin base, sin admin y sin variables de entorno (lo que pasa en un
 * deploy de Vercel sin configurar). Está prendido por defecto; solo `DEMO_MODE=false` lo apaga.
 */
export function isDemoMode(env: Env): boolean {
  return env.DEMO_MODE?.trim().toLowerCase() !== "false";
}

/**
 * Solo en el deploy de producción de Vercel o si se pide a mano: `npm run build` local sigue funcionando.
 * En modo demo no se comprueba nada: la demo no necesita ninguna variable.
 */
export function shouldCheckProductionEnv(env: Env): boolean {
  if (isDemoMode(env)) return false;
  return env.VERCEL_ENV === "production" || env.CHECK_PROD_ENV === "1";
}

const isBlank = (value: string | undefined) => !value || value.trim() === "";

/** Lanza un error con la lista de variables a corregir si `NODE_ENV` es `production`. */
export function assertProductionEnv(env: Env): void {
  if (env.NODE_ENV !== "production") return;

  const problems: string[] = [];

  const digits = (env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  if (!digits) {
    problems.push("NEXT_PUBLIC_WHATSAPP_NUMBER falta o no tiene dígitos");
  } else if (digits === PLACEHOLDER_WHATSAPP_NUMBER) {
    problems.push("NEXT_PUBLIC_WHATSAPP_NUMBER tiene el número de ejemplo");
  }

  for (const name of ["DATABASE_URL", "ADMIN_PASSWORD", "SESSION_SECRET"]) {
    if (isBlank(env[name])) problems.push(`${name} falta`);
  }

  if (problems.length > 0) {
    throw new Error(
      `Variables de entorno de producción a corregir antes de publicar:\n- ${problems.join("\n- ")}\nVer "Variables de entorno" en el README.`,
    );
  }
}
