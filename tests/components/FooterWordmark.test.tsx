import { cleanup, createEvent, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FooterWordmark } from "@/components/shop/FooterWordmark";

const originalMatchMedia = window.matchMedia;

function mockMotionPreference(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => mockMotionPreference(false));

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
});

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
});
