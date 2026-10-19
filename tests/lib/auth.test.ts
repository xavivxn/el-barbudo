import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLACEHOLDER_ADMIN_PASSWORD, verifyPassword } from "@/lib/auth";

describe("verifyPassword", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("acepta la contraseña exacta", () => {
    expect(verifyPassword("barba123", "barba123")).toBe(true);
  });

  it("rechaza una contraseña distinta", () => {
    expect(verifyPassword("barba12", "barba123")).toBe(false);
    expect(verifyPassword("barba1234", "barba123")).toBe(false);
  });

  it("rechaza vacíos", () => {
    expect(verifyPassword("", "")).toBe(false);
    expect(verifyPassword("", "barba123")).toBe(false);
  });

  it("sin ADMIN_PASSWORD configurada nunca entra", () => {
    // `undefined` activa el valor por defecto (process.env): se vacía para que el caso sea determinista.
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(verifyPassword("x", undefined)).toBe(false);
    expect(verifyPassword("", undefined)).toBe(false);
  });

  it("por defecto compara contra ADMIN_PASSWORD", () => {
    vi.stubEnv("ADMIN_PASSWORD", "barba123");
    expect(verifyPassword("barba123")).toBe(true);
    expect(verifyPassword("otra")).toBe(false);
  });

  describe("valor de ejemplo de .env.example", () => {
    it("coincide con el de .env.example", () => {
      const example = readFileSync(".env.example", "utf8");
      expect(example).toContain(`ADMIN_PASSWORD="${PLACEHOLDER_ADMIN_PASSWORD}"`);
    });

    it("en producción nunca entra, ni con la contraseña exacta, y no la escribe en el log", () => {
      vi.stubEnv("NODE_ENV", "production");
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(verifyPassword(PLACEHOLDER_ADMIN_PASSWORD, PLACEHOLDER_ADMIN_PASSWORD)).toBe(false);
      expect(log).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(log.mock.calls)).not.toContain(PLACEHOLDER_ADMIN_PASSWORD);
      log.mockRestore();
    });

    it("en producción también rechaza el valor de ejemplo pegado con comillas o espacios", () => {
      vi.stubEnv("NODE_ENV", "production");
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      for (const pasted of [
        `"${PLACEHOLDER_ADMIN_PASSWORD}"`,
        `'${PLACEHOLDER_ADMIN_PASSWORD}'`,
        `  ${PLACEHOLDER_ADMIN_PASSWORD} `,
        ` "${PLACEHOLDER_ADMIN_PASSWORD}" `,
      ]) {
        expect(verifyPassword(pasted, pasted)).toBe(false);
      }
      log.mockRestore();
    });

    it("en producción una contraseña propia sigue funcionando", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(verifyPassword("una-clave-larga-y-unica", "una-clave-larga-y-unica")).toBe(true);
    });

    it("fuera de producción el valor de ejemplo se acepta (desarrollo local)", () => {
      vi.stubEnv("NODE_ENV", "development");
      expect(verifyPassword(PLACEHOLDER_ADMIN_PASSWORD, PLACEHOLDER_ADMIN_PASSWORD)).toBe(true);
    });
  });
});
