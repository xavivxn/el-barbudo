import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyPassword } from "@/lib/auth";

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
});
