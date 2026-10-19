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

import { getSession, requireAdmin } from "@/lib/auth";

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
});
