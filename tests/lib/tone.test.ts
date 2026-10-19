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

  it("usa los colores exactos (claros más saturados para que el brillo se vea sobre la superficie blanca)", () => {
    const colors = (tag: string) => {
      const { light, dark } = toneFor({ tags: [tag] });
      return [light, dark];
    };
    expect(colors("fresco")).toEqual(["#A9C3DC", "#1F3A52"]);
    expect(colors("amaderado")).toEqual(["#CDB291", "#3A2A1E"]);
    expect(colors("dulce")).toEqual(["#E6BE7E", "#47331A"]);
    expect(colors("especiado")).toEqual(["#DBA88E", "#4A2519"]);
    expect(colors("natural")).toEqual(["#B8C79F", "#28331F"]);
    expect(toneFor({ tags: [] })).toEqual({ key: "bronce", light: "#D6BB8E", dark: "#33291E" });
  });
});
