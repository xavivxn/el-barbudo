import { describe, expect, it } from "vitest";
import { WORDMARK_MIN_RANGE_PX, WORDMARK_SEEN_AT, wordmarkFillMode } from "@/lib/wordmark";

const viewportHeight = 800;
const trackHeight = 200;

describe("wordmarkFillMode", () => {
  it("si la pista entra scrolleando y queda recorrido, el relleno sigue al scroll", () => {
    // Asoma 20 px por abajo: progreso 0,1; faltan 180 px y la página deja 180.
    expect(
      wordmarkFillMode({ trackTop: 780, trackHeight, viewportHeight, remainingScroll: 180 }),
    ).toBe("scroll");
  });

  it("si la palabra ya se ve al aparecer (p. ej. al cargar una página corta), se revela de una vez", () => {
    expect(
      wordmarkFillMode({ trackTop: 650, trackHeight, viewportHeight, remainingScroll: 50 }),
    ).toBe("reveal");
  });

  it("si el scroll arranca en ≥ 95 %, se revela de una vez", () => {
    expect(
      wordmarkFillMode({ trackTop: 605, trackHeight, viewportHeight, remainingScroll: 0 }),
    ).toBe("reveal");
  });

  it("el umbral de 'ya a la vista' es la mitad de la pista", () => {
    const top = viewportHeight - trackHeight * WORDMARK_SEEN_AT;
    expect(
      wordmarkFillMode({ trackTop: top, trackHeight, viewportHeight, remainingScroll: 500 }),
    ).toBe("reveal");
    expect(
      wordmarkFillMode({ trackTop: top + 1, trackHeight, viewportHeight, remainingScroll: 500 }),
    ).toBe("scroll");
  });

  it("con un recorrido mínimo (la página casi no deja scrollear), se revela", () => {
    expect(
      wordmarkFillMode({
        trackTop: 790,
        trackHeight,
        viewportHeight,
        remainingScroll: WORDMARK_MIN_RANGE_PX - 1,
      }),
    ).toBe("reveal");
  });

  it("sin medidas (alto 0, p. ej. sin layout) se revela en vez de quedar a medio llenar", () => {
    expect(
      wordmarkFillMode({ trackTop: 0, trackHeight: 0, viewportHeight, remainingScroll: 0 }),
    ).toBe("reveal");
  });
});
