import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertProductionEnv,
  isDemoMode,
  PLACEHOLDER_WHATSAPP_NUMBER,
  shouldCheckProductionEnv,
} from "@/lib/env-check";
import { site } from "@/site";

const valid = {
  NODE_ENV: "production",
  NEXT_PUBLIC_WHATSAPP_NUMBER: "+595 971 000-111",
  DATABASE_URL: "postgresql://usuario:clave@host/db",
  ADMIN_PASSWORD: "una-frase-larga-y-propia",
  SESSION_SECRET: "un-secreto-propio-de-mas-de-32-caracteres-x",
};

function errorOf(env: Record<string, string | undefined>): string {
  try {
    assertProductionEnv(env);
  } catch (error) {
    return (error as Error).message;
  }
  return "";
}

describe("assertProductionEnv", () => {
  it("con todo definido no lanza", () => {
    expect(() => assertProductionEnv(valid)).not.toThrow();
  });

  it("fuera de producción no comprueba nada", () => {
    expect(() => assertProductionEnv({ NODE_ENV: "development" })).not.toThrow();
    expect(() => assertProductionEnv({ NODE_ENV: "test" })).not.toThrow();
  });

  it.each([
    ["falta", undefined],
    ["vacío", ""],
    ["sin dígitos", "TBD"],
  ])("WhatsApp %s: falla y nombra la variable", (_case, value) => {
    expect(errorOf({ ...valid, NEXT_PUBLIC_WHATSAPP_NUMBER: value })).toContain("NEXT_PUBLIC_WHATSAPP_NUMBER");
  });

  it("WhatsApp con el número de ejemplo (aunque tenga formato) falla", () => {
    expect(errorOf({ ...valid, NEXT_PUBLIC_WHATSAPP_NUMBER: PLACEHOLDER_WHATSAPP_NUMBER })).toContain(
      "NEXT_PUBLIC_WHATSAPP_NUMBER tiene el número de ejemplo",
    );
    expect(errorOf({ ...valid, NEXT_PUBLIC_WHATSAPP_NUMBER: '"+595 000 000 000"' })).toContain(
      "NEXT_PUBLIC_WHATSAPP_NUMBER",
    );
  });

  it.each(["DATABASE_URL", "ADMIN_PASSWORD", "SESSION_SECRET"])("sin %s falla y la nombra", (name) => {
    expect(errorOf({ ...valid, [name]: undefined })).toContain(`${name} falta`);
    expect(errorOf({ ...valid, [name]: "   " })).toContain(`${name} falta`);
  });

  it("junta todos los problemas en un solo error", () => {
    const message = errorOf({ NODE_ENV: "production" });
    for (const name of ["NEXT_PUBLIC_WHATSAPP_NUMBER", "DATABASE_URL", "ADMIN_PASSWORD", "SESSION_SECRET"]) {
      expect(message).toContain(name);
    }
  });

  it("el mensaje nunca incluye los valores", () => {
    const env = { ...valid, NEXT_PUBLIC_WHATSAPP_NUMBER: "abc-sin-digitos", DATABASE_URL: "" };
    const message = errorOf(env);
    expect(message).not.toBe("");
    expect(message).not.toContain("abc-sin-digitos");
    expect(message).not.toContain(valid.ADMIN_PASSWORD);
    expect(message).not.toContain(valid.SESSION_SECRET);
  });
});

describe("shouldCheckProductionEnv", () => {
  const real = { DEMO_MODE: "false" };

  it("con la tienda real, solo en el deploy de producción de Vercel o con CHECK_PROD_ENV=1", () => {
    expect(shouldCheckProductionEnv({ ...real, VERCEL_ENV: "production" })).toBe(true);
    expect(shouldCheckProductionEnv({ ...real, CHECK_PROD_ENV: "1" })).toBe(true);
    expect(shouldCheckProductionEnv({ ...real, VERCEL_ENV: "preview" })).toBe(false);
    expect(shouldCheckProductionEnv({ ...real, NODE_ENV: "production" })).toBe(false);
    expect(shouldCheckProductionEnv(real)).toBe(false);
  });

  it("en modo demo nunca comprueba (un deploy de Vercel sin variables publica la demo)", () => {
    expect(shouldCheckProductionEnv({ VERCEL_ENV: "production" })).toBe(false);
    expect(shouldCheckProductionEnv({ CHECK_PROD_ENV: "1" })).toBe(false);
    expect(shouldCheckProductionEnv({ DEMO_MODE: "true", VERCEL_ENV: "production", CHECK_PROD_ENV: "1" })).toBe(false);
  });
});

describe("isDemoMode", () => {
  it("está prendido por defecto", () => {
    expect(isDemoMode({})).toBe(true);
    expect(isDemoMode({ DEMO_MODE: "" })).toBe(true);
  });

  it.each(["false", "FALSE", " false ", "False\n"])("DEMO_MODE=%j lo apaga", (value) => {
    expect(isDemoMode({ DEMO_MODE: value })).toBe(false);
  });

  it.each(["true", "1", "no", "0"])("cualquier otro valor (%j) lo deja prendido", (value) => {
    expect(isDemoMode({ DEMO_MODE: value })).toBe(true);
  });

  it(".env.example arranca la tienda real", () => {
    expect(readFileSync(".env.example", "utf8")).toContain('DEMO_MODE="false"');
  });
});

describe("número de ejemplo", () => {
  it("está en .env.example y no es el número del local", () => {
    expect(site.whatsapp).not.toBe(PLACEHOLDER_WHATSAPP_NUMBER);
    expect(readFileSync(".env.example", "utf8")).toContain(`NEXT_PUBLIC_WHATSAPP_NUMBER="${PLACEHOLDER_WHATSAPP_NUMBER}"`);
  });
});
