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

  it("usa los colores exactos", () => {
    const { light, dark } = toneFor({ tags: ["fresco"] });
    expect(light).toBe("#DCE6EE");
    expect(dark).toBe("#1F3A52");
    expect(toneFor({ tags: [] })).toEqual({ key: "bronce", light: "#EDE3D3", dark: "#33291E" });
  });
});
