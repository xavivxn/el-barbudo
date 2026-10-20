import { act, cleanup, createEvent, fireEvent, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FooterWordmark } from "@/components/shop/FooterWordmark";

// En jsdom no hay IntersectionObserver: `useInView` se controla desde cada test. `animate` se espía
// (y se delega en el real) para ver el revelado de una vez.
const motionState = vi.hoisted(() => ({ inView: true, animateCalls: [] as unknown[][] }));
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useInView: () => motionState.inView,
    animate: (...args: unknown[]) => {
      motionState.animateCalls.push(args);
      return (actual.animate as (...a: unknown[]) => unknown)(...args);
    },
  };
});

const originalMatchMedia = window.matchMedia;

function mockMotionPreference(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  mockMotionPreference(false);
  motionState.inView = true;
  motionState.animateCalls = [];
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.matchMedia = originalMatchMedia;
});

/** La pista del relleno queda `top` px por debajo del borde superior de una pantalla de 800 px. */
function layout({ top, scrollHeight }: { top: number; scrollHeight: number }) {
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
  vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(scrollHeight);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    top,
    height: 200,
    left: 0,
    width: 800,
    right: 800,
    bottom: top + 200,
    x: 0,
    y: top,
  } as DOMRect);
}

const scrollLayer = (container: HTMLElement) =>
  container.querySelector<HTMLElement>(".wordmark__fill--scroll");

/** jsdom no implementa PointerEvent: se arma un evento con los campos que lee el hook. */
function pointerMove(el: Element, pointerType: string, clientX: number, clientY: number) {
  const event = createEvent.pointerMove(el, { clientX, clientY });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  fireEvent(el, event);
}

function setup() {
  const { container } = render(<FooterWordmark />);
  const wordmark = container.firstElementChild as HTMLElement;
  wordmark.getBoundingClientRect = () =>
    ({ left: 100, top: 40, width: 800, height: 150, right: 900, bottom: 190, x: 100, y: 40 }) as DOMRect;
  return { container, wordmark };
}

describe("FooterWordmark", () => {
  it("es decorativo: aria-hidden y la marca no se anuncia dos veces", () => {
    const { wordmark } = setup();
    expect(wordmark).toHaveAttribute("aria-hidden", "true");
    expect(wordmark).toHaveTextContent("EL BARBUDO");
  });

  it("con el mouse escribe --mx/--my relativos a la palabra", () => {
    const { wordmark } = setup();
    pointerMove(wordmark, "mouse", 350, 100);

    expect(wordmark.style.getPropertyValue("--mx")).toBe("250px");
    expect(wordmark.style.getPropertyValue("--my")).toBe("60px");
  });

  it("con touch o lápiz no toca las variables", () => {
    const { wordmark } = setup();
    pointerMove(wordmark, "touch", 350, 100);
    pointerMove(wordmark, "pen", 400, 120);

    expect(wordmark.style.getPropertyValue("--mx")).toBe("");
    expect(wordmark.style.getPropertyValue("--my")).toBe("");
  });

  it("con movimiento normal renderiza las capas del mouse y del scroll", () => {
    const { wordmark, container } = setup();
    expect(wordmark).toHaveAttribute("data-variant", "live");
    expect(container.querySelector(".wordmark__fill--hover")).not.toBeNull();
    expect(container.querySelector(".wordmark__fill--scroll")).not.toBeNull();
    expect(container.querySelector(".wordmark__fill--static")).toBeNull();
  });

  it("con reduced motion renderiza la variante estática y no sigue al mouse", () => {
    mockMotionPreference(true);
    const { wordmark, container } = setup();

    expect(wordmark).toHaveAttribute("data-variant", "static");
    expect(container.querySelector(".wordmark__fill--static")).not.toBeNull();
    expect(container.querySelector(".wordmark__fill--hover")).toBeNull();
    expect(container.querySelector(".wordmark__fill--scroll")).toBeNull();

    pointerMove(wordmark, "mouse", 350, 100);
    expect(wordmark.style.getPropertyValue("--mx")).toBe("");
  });
  it("sin JS solo se ve el contorno: la capa de scroll arranca abajo", () => {
    const html = renderToString(<FooterWordmark />);
    expect(html).toMatch(/wordmark__fill--scroll[^>]*translateY\(100%\)/);
  });

  it("con la palabra ya en pantalla al cargar, el relleno sube una vez (900 ms, ease-out)", async () => {
    layout({ top: 500, scrollHeight: 900 });
    const { container } = render(<FooterWordmark />);

    expect(motionState.animateCalls).toHaveLength(1);
    const [, target, options] = motionState.animateCalls[0];
    expect(target).toBe(1);
    expect(options).toEqual({ duration: 0.9, ease: "easeOut" });
    // Al terminar queda lleno, no a medias.
    await act(() => new Promise((resolve) => setTimeout(resolve, 1000)));
    expect(scrollLayer(container)?.style.transform).toMatch(/none|translateY\(0%\)/);
  });

  it("el revelado espera a que la palabra entre en pantalla", () => {
    layout({ top: 500, scrollHeight: 900 });
    motionState.inView = false;
    const { rerender } = render(<FooterWordmark />);
    expect(motionState.animateCalls).toHaveLength(0);

    motionState.inView = true;
    rerender(<FooterWordmark />);
    expect(motionState.animateCalls).toHaveLength(1);
  });

  it("con la palabra lejos y recorrido de sobra, sigue al scroll y no revela de una vez", () => {
    layout({ top: 2400, scrollHeight: 4000 });
    const { container } = render(<FooterWordmark />);
    expect(motionState.animateCalls).toHaveLength(0);
    expect(scrollLayer(container)?.style.transform).toBe("translateY(100%)");
  });

  it("con reduced motion no hay revelado: queda el relleno estático", () => {
    mockMotionPreference(true);
    layout({ top: 500, scrollHeight: 900 });
    render(<FooterWordmark />);
    expect(motionState.animateCalls).toHaveLength(0);
  });
});
