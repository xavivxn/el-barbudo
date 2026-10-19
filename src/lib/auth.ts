import { createHash, timingSafeEqual } from "node:crypto";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type SessionData = { isAdmin?: boolean };

const SEVEN_DAYS = 60 * 60 * 24 * 7;

/** Valores de ejemplo de `.env.example`: en producción se rechazan (hay un test que los mantiene alineados). */
export const PLACEHOLDER_ADMIN_PASSWORD = "cambiar-esta-contrasena";
export const PLACEHOLDER_SESSION_SECRET = "cambiar-por-un-secreto-de-al-menos-32-caracteres";

const isProduction = () => process.env.NODE_ENV === "production";

/** Ignora espacios y comillas que quedan al pegar el valor desde `.env.example` en el panel del hosting. */
const isPlaceholder = (value: string, placeholder: string) =>
  value.trim().replace(/^["']+|["']+$/g, "").trim() === placeholder;

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/**
 * Compara en tiempo constante. Se comparan los SHA-256 de ambas cadenas (siempre 32 bytes)
 * para que `timingSafeEqual` no falle por largos distintos ni filtre el largo de la contraseña.
 * Sin contraseña configurada o con entrada vacía, nunca entra. En producción tampoco entra
 * si la contraseña configurada es la de ejemplo de `.env.example` (se avisa en el log, sin el valor).
 */
export function verifyPassword(
  input: string,
  expected: string | undefined = process.env.ADMIN_PASSWORD,
): boolean {
  if (!input || !expected) return false;
  if (isProduction() && isPlaceholder(expected, PLACEHOLDER_ADMIN_PASSWORD)) {
    console.error(
      "ADMIN_PASSWORD tiene el valor de ejemplo de .env.example: el acceso al admin queda bloqueado hasta definir una contraseña propia.",
    );
    return false;
  }
  return timingSafeEqual(sha256(input), sha256(expected));
}

function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET debe estar definida y tener al menos 32 caracteres.");
  }
  if (isProduction() && isPlaceholder(password, PLACEHOLDER_SESSION_SECRET)) {
    throw new Error(
      "SESSION_SECRET tiene el valor de ejemplo de .env.example. Defínela con un secreto propio y único antes de usar el admin en producción.",
    );
  }
  return {
    cookieName: "eb_admin",
    password,
    ttl: SEVEN_DAYS,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}

/** Redirige al login si no hay sesión de admin. Llamar al inicio de layouts y Server Actions del panel. */
export async function requireAdmin(): Promise<void> {
  const session = await getSession();
  if (!session.isAdmin) redirect("/admin/login");
}
