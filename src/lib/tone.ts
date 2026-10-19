import type { ProductDTO } from "@/lib/types";

export type Tone = {
  key: "fresco" | "amaderado" | "dulce" | "especiado" | "natural" | "bronce";
  /**
   * Color del brillo radial en modo claro. Es seguro solo porque el brillo nunca queda detrás del
   * texto (Ruling R3: va detrás de la foto y se apaga antes del área de texto). Sobre estos tonos,
   * `text-fg` (#141414) llega a 8.8–10.6:1, pero `text-muted` (#6B6762) solo a 2.7–3.2:1: si algún
   * día el texto pasa por encima, hay que aclararlos de nuevo.
   */
  light: string;
  /** Color del brillo radial en modo oscuro (tono profundo). */
  dark: string;
};

const TONES: Record<Tone["key"], Tone> = {
  fresco: { key: "fresco", light: "#A9C3DC", dark: "#1F3A52" },
  amaderado: { key: "amaderado", light: "#CDB291", dark: "#3A2A1E" },
  dulce: { key: "dulce", light: "#E6BE7E", dark: "#47331A" },
  especiado: { key: "especiado", light: "#DBA88E", dark: "#4A2519" },
  natural: { key: "natural", light: "#B8C79F", dark: "#28331F" },
  bronce: { key: "bronce", light: "#D6BB8E", dark: "#33291E" },
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
