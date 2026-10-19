import { createHash, timingSafeEqual } from "node:crypto";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type SessionData = { isAdmin?: boolean };

const SEVEN_DAYS = 60 * 60 * 24 * 7;

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/**
 * Compara en tiempo constante. Se comparan los SHA-256 de ambas cadenas (siempre 32 bytes)
 * para que `timingSafeEqual` no falle por largos distintos ni filtre el largo de la contraseña.
 * Sin contraseña configurada o con entrada vacía, nunca entra.
 */
export function verifyPassword(
  input: string,
  expected: string | undefined = process.env.ADMIN_PASSWORD,
): boolean {
  if (!input || !expected) return false;
  return timingSafeEqual(sha256(input), sha256(expected));
}

function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET debe estar definida y tener al menos 32 caracteres.");
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
