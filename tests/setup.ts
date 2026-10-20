import "@testing-library/jest-dom/vitest";

// jsdom no implementa canvas y avisa por consola en cada `getContext`: sin contexto, la bruma de la
// vitrina no anima (cada test que la necesite pone su propio contexto falso).
// Los tests con `@vitest-environment node` no tienen DOM.
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
}
