import { describe, expect, it } from "vitest";
import { toneFor } from "@/lib/tone";

describe("toneFor", () => {
  it("gana la primera etiqueta del producto que tenga tono", () => {
    expect(toneFor({ tags: ["cítrico", "amaderado"] }).key).toBe("fresco");
    expect(toneFor({ tags: ["noche", "amaderado"] }).key).toBe("amaderado");
    expect(toneFor({ tags: ["amaderado", "cítrico"] }).key).toBe("amaderado");
  });

  it("mapea cada etiqueta a su tono", () => {
    expect(toneFor({ tags: ["fresco"] }).key).toBe("fresco");
    expect(toneFor({ tags: ["dulce"] }).key).toBe("dulce");
    expect(toneFor({ tags: ["especiado"] }).key).toBe("especiado");
    expect(toneFor({ tags: ["intenso"] }).key).toBe("especiado");
    expect(toneFor({ tags: ["natural"] }).key).toBe("natural");
  });

  it("cae en bronce sin etiquetas o sin ninguna con tono", () => {
    expect(toneFor({ tags: [] }).key).toBe("bronce");
    expect(toneFor({ tags: ["día", "suave"] }).key).toBe("bronce");
  });

  it("da una luz saturada por modo para el aura de la foto", () => {
    const glow = (tag: string) => toneFor({ tags: [tag] }).glow;
    expect(glow("fresco")).toEqual({ light: "#6F9FD3", dark: "#4A8BD0" });
    expect(glow("amaderado")).toEqual({ light: "#B9864F", dark: "#B07A44" });
    expect(glow("dulce")).toEqual({ light: "#E2A23E", dark: "#D9982F" });
    expect(glow("especiado")).toEqual({ light: "#D4764F", dark: "#C9603A" });
    expect(glow("natural")).toEqual({ light: "#8EAE5E", dark: "#7C9C4C" });
    expect(toneFor({ tags: [] })).toEqual({ key: "bronce", glow: { light: "#C9A66B", dark: "#C9A66B" } });
  });
});
