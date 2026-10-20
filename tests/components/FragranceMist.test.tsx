import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FragranceMist } from "@/components/shop/home/FragranceMist";

// En jsdom no hay IntersectionObserver: `useInView` se controla desde cada test.
const viewport = vi.hoisted(() => ({ inView: true }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useInView: () => viewport.inView,
}));

const originalMatchMedia = window.matchMedia;
const originalGetContext = HTMLCanvasElement.prototype.getContext;

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

/** jsdom no implementa canvas: un contexto 2D falso con lo que usa la bruma. */
function fakeContext() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    fillStyle: "#000000",
  };
}

let nextFrame = 0;
const raf = vi.fn((callback: FrameRequestCallback) => {
  void callback;
  return ++nextFrame;
});
const caf = vi.fn();

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  viewport.inView = true;
  nextFrame = 0;
  raf.mockClear();
  caf.mockClear();
  mockReducedMotion(false);
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => fakeContext(),
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  vi.stubGlobal("requestAnimationFrame", raf);
  vi.stubGlobal("cancelAnimationFrame", caf);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.matchMedia = originalMatchMedia;
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  setHidden(false);
});

describe("FragranceMist", () => {
  it("con reduced motion no monta nada", () => {
    mockReducedMotion(true);
    const { container } = render(<FragranceMist />);
    expect(container).toBeEmptyDOMElement();
    expect(raf).not.toHaveBeenCalled();
  });

  it("es un canvas decorativo y anima mientras está en pantalla", () => {
    const { container } = render(<FragranceMist />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(raf).toHaveBeenCalled();
  });

  it("al desmontar cancela el requestAnimationFrame pendiente", () => {
    const { unmount } = render(<FragranceMist />);
    const pending = raf.mock.results.at(-1)?.value;
    expect(pending).toBeGreaterThan(0);
    unmount();
    expect(caf).toHaveBeenCalledWith(pending);
  });

  it("fuera de pantalla no arranca el bucle", () => {
    viewport.inView = false;
    render(<FragranceMist />);
    expect(raf).not.toHaveBeenCalled();
  });

  it("con la pestaña oculta se detiene", () => {
    render(<FragranceMist />);
    const pending = raf.mock.results.at(-1)?.value;
    act(() => setHidden(true));
    expect(caf).toHaveBeenCalledWith(pending);
  });

  it("sin contexto 2D (navegador sin canvas) no anima", () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () => null,
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    render(<FragranceMist />);
    expect(raf).not.toHaveBeenCalled();
  });
});
