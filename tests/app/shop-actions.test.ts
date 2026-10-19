import { beforeEach, describe, expect, it, vi } from "vitest";
import { refreshCart } from "@/app/(shop)/actions";
import { getVariantSnapshots } from "@/lib/products";

vi.mock("@/lib/products", () => ({ getVariantSnapshots: vi.fn() }));

const snapshots = vi.mocked(getVariantSnapshots);

beforeEach(() => {
  snapshots.mockReset();
  snapshots.mockResolvedValue([]);
});

describe("refreshCart", () => {
  it("quita duplicados y descarta lo que no es texto", async () => {
    await refreshCart(["a", "b", "a", 7, null, undefined, "c"] as unknown as string[]);
    expect(snapshots).toHaveBeenCalledWith(["a", "b", "c"]);
  });

  it("no recorta carritos grandes: consulta todos los ids", async () => {
    const ids = Array.from({ length: 120 }, (_, i) => `v${i}`);
    await refreshCart(ids);
    expect(snapshots).toHaveBeenCalledWith(ids);
  });

  it("rechaza entradas absurdas en vez de recortarlas", async () => {
    const ids = Array.from({ length: 501 }, (_, i) => `v${i}`);
    await expect(refreshCart(ids)).rejects.toThrow();
    expect(snapshots).not.toHaveBeenCalled();
  });

  it("devuelve vacío si la entrada no es una lista", async () => {
    expect(await refreshCart("x" as unknown as string[])).toEqual([]);
    expect(snapshots).not.toHaveBeenCalled();
  });
});
