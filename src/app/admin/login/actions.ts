"use server";

import { redirect } from "next/navigation";
import { getSession, verifyPassword } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (DEMO_MODE) return { error: "El panel está deshabilitado en la demo." };
  const password = formData.get("password");
  if (typeof password !== "string" || !verifyPassword(password)) {
    return { error: "Contraseña incorrecta." };
  }

  const session = await getSession();
  session.isAdmin = true;
  await session.save();

  // redirect lanza una excepción de control de flujo: va fuera de cualquier try/catch.
  redirect("/admin");
}

export async function logout(): Promise<void> {
  if (DEMO_MODE) redirect("/admin");
  const session = await getSession();
  session.destroy();
  redirect("/admin/login");
}
