import type { ProductDTO } from "@/lib/types";

export type Tone = {
  key: "fresco" | "amaderado" | "dulce" | "especiado" | "natural" | "bronce";
  /**
   * Luz saturada del aura que rodea la foto de la vitrina (halo, borde de luz y sombra de color),
   * por modo. Es segura solo porque se funde antes del área de texto (Ruling R3): sobre estos colores
   * `text-muted` no llegaría a 4.5:1, así que el texto nunca debe quedar encima.
   */
  glow: { light: string; dark: string };
};

const TONES: Record<Tone["key"], Tone> = {
  fresco: { key: "fresco", glow: { light: "#6F9FD3", dark: "#4A8BD0" } },
  amaderado: { key: "amaderado", glow: { light: "#B9864F", dark: "#B07A44" } },
  dulce: { key: "dulce", glow: { light: "#E2A23E", dark: "#D9982F" } },
  especiado: { key: "especiado", glow: { light: "#D4764F", dark: "#C9603A" } },
  natural: { key: "natural", glow: { light: "#8EAE5E", dark: "#7C9C4C" } },
  bronce: { key: "bronce", glow: { light: "#C9A66B", dark: "#C9A66B" } },
};

const TAG_TONE: Record<string, Tone["key"]> = {
  fresco: "fresco",
  cítrico: "fresco",
  amaderado: "amaderado",
  dulce: "dulce",
  especiado: "especiado",
  intenso: "especiado",
  natural: "natural",
};

/** El tono lo da la primera etiqueta del producto que tenga uno; sin ninguna, bronce. */
export function toneFor(product: Pick<ProductDTO, "tags">): Tone {
  for (const tag of product.tags) {
    const key = Object.hasOwn(TAG_TONE, tag) ? TAG_TONE[tag] : undefined;
    if (key) return TONES[key];
  }
  return TONES.bronce;
}
