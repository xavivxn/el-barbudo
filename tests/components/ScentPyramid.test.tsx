import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScentPyramid } from "@/components/shop/ScentPyramid";

const glow = { light: "#6F9FD3", dark: "#4A8BD0" };
const notes = { top: "Bergamota, limón", heart: "Jengibre, jazmín", base: "Cedro, sándalo" };

// jsdom no trae IntersectionObserver (whileInView lo usa): uno que nunca dispara alcanza.
beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ScentPyramid", () => {
  it("muestra Salida, Corazón y Fondo con sus notas, en ese orden", () => {
    const { container } = render(<ScentPyramid notes={notes} glow={glow} />);

    expect(screen.getByRole("heading", { level: 2, name: "Pirámide olfativa" })).toBeInTheDocument();
    const list = container.querySelector("dl") as HTMLElement;
    const terms = within(list).getAllByRole("term");
    const definitions = within(list).getAllByRole("definition");
    expect(terms.map((t) => t.textContent)).toEqual(["Salida", "Corazón", "Fondo"]);
    expect(definitions.map((d) => d.textContent)).toEqual([notes.top, notes.heart, notes.base]);
  });

  it("las barras son decorativas", () => {
    const { container } = render(<ScentPyramid notes={notes} glow={glow} />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
  });

  it("no dibuja nada sin notas", () => {
    const { container } = render(<ScentPyramid notes={null} glow={glow} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("el HTML del servidor no esconde nada (se ve sin JS)", () => {
    const html = renderToString(<ScentPyramid notes={notes} glow={glow} />);
    expect(html).not.toMatch(/opacity:\s*0(?![.\d])/);
    expect(html).toContain("Salida");
    expect(html).toContain(notes.base);
  });

  it("ya montado se esconde para entrar con la cascada", () => {
    const { container } = render(<ScentPyramid notes={notes} glow={glow} />);
    const layers = container.querySelectorAll("dl > div");
    expect(layers).toHaveLength(3);
    for (const layer of layers) expect((layer as HTMLElement).style.opacity).toBe("0");
  });
});
