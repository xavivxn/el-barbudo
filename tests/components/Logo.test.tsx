import { cleanup, render } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Logo } from "@/components/ui/Logo";
import { Reveal } from "@/components/ui/Reveal";

type MockImageProps = ImgHTMLAttributes<HTMLImageElement> & { preload?: boolean; priority?: boolean };

// Deja ver en el DOM las props de next/image que importan acá.
vi.mock("next/image", () => ({
  default: ({ preload, priority, ...img }: MockImageProps) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...img} alt={img.alt ?? ""} data-preload={String(Boolean(preload))} data-priority={String(Boolean(priority))} />
  ),
}));

afterEach(cleanup);

describe("Logo", () => {
  it("con preload (la cabecera) precarga; nunca usa la prop priority, que Next 16 marca como obsoleta", () => {
    const { container } = render(<Logo variant="mark" preload />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("data-preload", "true");
    expect(img).toHaveAttribute("data-priority", "false");
  });

  it("por defecto (pie, login) no precarga", () => {
    const { container } = render(<Logo variant="full" />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("data-preload", "false");
    expect(img).toHaveAttribute("data-priority", "false");
  });
});

describe("Reveal", () => {
  // jsdom no trae IntersectionObserver (whileInView lo usa): uno que nunca dispara alcanza.
  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("marca su elemento con data-reveal para el <noscript> del layout", () => {
    const { container } = render(
      <Reveal className="mt-4">
        <p>Contenido</p>
      </Reveal>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-reveal");
    expect(container.firstElementChild).toHaveClass("mt-4");
  });
});
