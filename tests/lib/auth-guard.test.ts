// @vitest-environment node
import { sealData } from "iron-session";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "x".repeat(40);

const store = vi.hoisted(() => ({ jar: new Map<string, string>() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = store.jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => void store.jar.set(name, value),
    delete: (name: string) => void store.jar.delete(name),
  }),
}));

const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
);
vi.mock("next/navigation", () => ({ redirect }));

import { readFileSync } from "node:fs";
import { getSession, PLACEHOLDER_SESSION_SECRET, requireAdmin } from "@/lib/auth";

beforeEach(() => {
  store.jar.clear();
  redirect.mockClear();
  vi.stubEnv("SESSION_SECRET", SECRET);
});
afterEach(() => vi.unstubAllEnvs());

async function sealedCookie(data: object, password = SECRET) {
  return sealData(data, { password, ttl: 60 * 60 });
}

describe("requireAdmin", () => {
  it("sin cookie de sesión redirige al login", async () => {
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/admin/login");
    expect(redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("con una sesión que no es de admin redirige al login", async () => {
    store.jar.set("eb_admin", await sealedCookie({}));
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/admin/login");
  });

  it("con una cookie adulterada o sellada con otra clave redirige al login", async () => {
    store.jar.set("eb_admin", await sealedCookie({ isAdmin: true }, "y".repeat(40)));
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/admin/login");

    store.jar.set("eb_admin", "no-es-una-cookie-sellada");
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/admin/login");
    expect(redirect).toHaveBeenCalledTimes(2);
  });

  it("con una sesión de admin válida no redirige", async () => {
    store.jar.set("eb_admin", await sealedCookie({ isAdmin: true }));
    await expect(requireAdmin()).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("getSession", () => {
  it("falla si falta SESSION_SECRET", async () => {
    vi.stubEnv("SESSION_SECRET", "");
    await expect(getSession()).rejects.toThrow(/SESSION_SECRET/);
  });

  it("falla si SESSION_SECRET tiene menos de 32 caracteres", async () => {
    vi.stubEnv("SESSION_SECRET", "x".repeat(31));
    await expect(getSession()).rejects.toThrow(/SESSION_SECRET/);
  });

  it("requireAdmin no deja pasar a nadie cuando la clave es inválida", async () => {
    vi.stubEnv("SESSION_SECRET", "corta");
    await expect(requireAdmin()).rejects.toThrow(/SESSION_SECRET/);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("el valor de ejemplo coincide con el de .env.example", () => {
    expect(readFileSync(".env.example", "utf8")).toContain(
      `SESSION_SECRET="${PLACEHOLDER_SESSION_SECRET}"`,
    );
  });

  it("en producción rechaza el SESSION_SECRET de .env.example sin repetirlo en el error", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", PLACEHOLDER_SESSION_SECRET);
    const error = await getSession().catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/SESSION_SECRET/);
    expect((error as Error).message).not.toContain(PLACEHOLDER_SESSION_SECRET);
    await expect(requireAdmin()).rejects.toThrow(/SESSION_SECRET/);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("en producción un SESSION_SECRET propio funciona", async () => {
    vi.stubEnv("NODE_ENV", "production");
    store.jar.set("eb_admin", await sealedCookie({ isAdmin: true }));
    await expect(requireAdmin()).resolves.toBeUndefined();
  });
});
