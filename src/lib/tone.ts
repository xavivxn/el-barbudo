import type { ProductDTO } from "@/lib/types";

export type Tone = {
  key: "fresco" | "amaderado" | "dulce" | "especiado" | "natural" | "bronce";
  /** Color del brillo radial en modo claro (pastel). El texto encima sigue siendo `text-fg`. */
  light: string;
  /** Color del brillo radial en modo oscuro (tono profundo). */
  dark: string;
};

const TONES: Record<Tone["key"], Tone> = {
  fresco: { key: "fresco", light: "#DCE6EE", dark: "#1F3A52" },
  amaderado: { key: "amaderado", light: "#E8DDD0", dark: "#3A2A1E" },
  dulce: { key: "dulce", light: "#F1E3CC", dark: "#47331A" },
  especiado: { key: "especiado", light: "#EED9CF", dark: "#4A2519" },
  natural: { key: "natural", light: "#E0E5D6", dark: "#28331F" },
  bronce: { key: "bronce", light: "#EDE3D3", dark: "#33291E" },
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
