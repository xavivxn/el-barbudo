import { describe, expect, it } from "vitest";
import { isMorphNamed, morphName } from "@/lib/morph";

describe("morph", () => {
  it("el nombre es producto-<slug>", () => {
    expect(morphName("noche-de-cuero")).toBe("producto-noche-de-cuero");
  });

  it("sin armar, ninguna instancia lleva nombre", () => {
    expect(isMorphNamed(null, "r1", "bleu")).toBe(false);
  });

  it("armado, solo la instancia activada lleva nombre (aunque otra muestre el mismo producto)", () => {
    const arm = { slug: "bleu", owner: "r1" };
    expect(isMorphNamed(arm, "r1", "bleu")).toBe(true);
    expect(isMorphNamed(arm, "r2", "bleu")).toBe(false);
    expect(isMorphNamed(arm, "r1", "otro")).toBe(false);
  });
});
