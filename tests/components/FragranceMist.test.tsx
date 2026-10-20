import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FragranceMist, MIST_FADE_MS } from "@/components/shop/home/FragranceMist";

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
let pendingFrame: FrameRequestCallback | null = null;
const raf = vi.fn((callback: FrameRequestCallback) => {
  pendingFrame = callback;
  return ++nextFrame;
});

/** Corre el cuadro pendiente de rAF en el instante `now` (ms). */
function runFrame(now: number) {
  const callback = pendingFrame;
  pendingFrame = null;
  callback?.(now);
}
const caf = vi.fn();

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  viewport.inView = true;
  nextFrame = 0;
  pendingFrame = null;
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
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.matchMedia = originalMatchMedia;
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  setHidden(false);
});

describe("FragranceMist", () => {
  it("con reduced motion no monta nada", () => {
    mockReducedMotion(true);
    const { container } = render(<FragranceMist active />);
    expect(container).toBeEmptyDOMElement();
    expect(raf).not.toHaveBeenCalled();
  });

  it("es un canvas decorativo y anima mientras está en pantalla", () => {
    const { container } = render(<FragranceMist active />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(raf).toHaveBeenCalled();
  });

  it("al desmontar cancela el requestAnimationFrame pendiente", () => {
    const { unmount } = render(<FragranceMist active />);
    const pending = raf.mock.results.at(-1)?.value;
    expect(pending).toBeGreaterThan(0);
    unmount();
    expect(caf).toHaveBeenCalledWith(pending);
  });

  it("fuera de pantalla no arranca el bucle", () => {
    viewport.inView = false;
    render(<FragranceMist active />);
    expect(raf).not.toHaveBeenCalled();
  });

  it("con la pestaña oculta se detiene", () => {
    render(<FragranceMist active />);
    const pending = raf.mock.results.at(-1)?.value;
    act(() => setHidden(true));
    expect(caf).toHaveBeenCalledWith(pending);
  });

  it("sin contexto 2D (navegador sin canvas) no anima", () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () => null,
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    render(<FragranceMist active />);
    expect(raf).not.toHaveBeenCalled();
  });
  it("dibuja a ~30 cuadros por segundo aunque rAF corra a 60 o 120 Hz", () => {
    vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(400);
    vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(300);
    const context = fakeContext();
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () => context,
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    render(<FragranceMist active />);
    // El sprite también limpia con clearRect al armarse: se cuenta desde acá.
    context.clearRect.mockClear();

    // Un segundo a 120 Hz: 121 cuadros de rAF, ~30 dibujados (clearRect, uno por dibujo).
    for (let i = 0; i <= 120; i++) runFrame(i * (1000 / 120));
    expect(context.clearRect).toHaveBeenCalledTimes(31);
    // Y a 60 Hz, uno de cada dos.
    context.clearRect.mockClear();
    for (let i = 1; i <= 60; i++) runFrame(1000 + i * (1000 / 60));
    expect(context.clearRect).toHaveBeenCalledTimes(30);
  });

  it("no pasa de 1 de densidad de píxeles: la niebla difusa se ve igual", () => {
    vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(400);
    vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(300);
    vi.stubGlobal("devicePixelRatio", 2);
    const { container } = render(<FragranceMist active />);
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    expect([canvas.width, canvas.height]).toEqual([400, 300]);
  });

  it("al dejar de ser la activa se detiene, se funde y recién después se desmonta", () => {
    // Solo los timeouts: rAF sigue siendo el falso de arriba.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { container, rerender } = render(<FragranceMist active />);
    const pending = raf.mock.results.at(-1)?.value;
    expect(container.querySelector("canvas")).not.toHaveAttribute("data-leaving");

    rerender(<FragranceMist active={false} />);
    // Un solo bucle a la vez: la saliente ya no anima mientras se funde.
    expect(caf).toHaveBeenCalledWith(pending);
    const canvas = container.querySelector("canvas");
    expect(canvas).toHaveAttribute("data-leaving");
    expect(canvas).toHaveClass("opacity-0", "transition-opacity");

    act(() => vi.advanceTimersByTime(MIST_FADE_MS - 1));
    expect(container.querySelector("canvas")).not.toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("si vuelve a ser la activa durante el fundido, sigue montada y anima de nuevo", () => {
    // Solo los timeouts: rAF sigue siendo el falso de arriba.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { container, rerender } = render(<FragranceMist active />);
    rerender(<FragranceMist active={false} />);
    raf.mockClear();
    rerender(<FragranceMist active />);
    act(() => vi.advanceTimersByTime(MIST_FADE_MS * 2));
    expect(container.querySelector("canvas")).not.toHaveAttribute("data-leaving");
    expect(raf).toHaveBeenCalled();
  });

  it("una inactiva no monta nada", () => {
    const { container } = render(<FragranceMist active={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
