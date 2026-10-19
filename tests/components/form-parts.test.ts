import { notFound, redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { SAVE_FAILED, withSaveFallback } from "@/components/admin/form-parts";

describe("withSaveFallback", () => {
  it("devuelve lo que devuelve la action", async () => {
    const save = withSaveFallback(async () => ({ saved: true }));
    expect(await save({}, new FormData())).toEqual({ saved: true });
  });

  it("un rechazo (sin conexión) se vuelve un mensaje del formulario", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const save = withSaveFallback(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await save({}, new FormData())).toEqual({ message: SAVE_FAILED });
    expect(SAVE_FAILED).toBe("No pudimos guardar. Probá de nuevo.");
    log.mockRestore();
  });

  it("redirect y notFound de Next se vuelven a lanzar", async () => {
    const redirecting = withSaveFallback(async () => redirect("/admin?guardado=1"));
    await expect(redirecting({}, new FormData())).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    const missing = withSaveFallback(async () => notFound());
    await expect(missing({}, new FormData())).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });
});
