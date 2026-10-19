import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

const originalMatchMedia = window.matchMedia;

function Probe() {
  return <p>{usePrefersReducedMotion() ? "reducido" : "normal"}</p>;
}

/** jsdom no implementa matchMedia: una consulta falsa que avisa sus cambios. */
function mockMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches && query === "(prefers-reduced-motion: reduce)";
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  })) as unknown as typeof window.matchMedia;
  return {
    listeners,
    set(next: boolean) {
      matches = next;
      for (const listener of listeners) listener();
    },
  };
}

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
});

describe("usePrefersReducedMotion", () => {
  it("lee la preferencia del sistema y sigue sus cambios", () => {
    const media = mockMatchMedia(false);
    const { unmount } = render(<Probe />);
    expect(screen.getByText("normal")).toBeInTheDocument();

    act(() => media.set(true));
    expect(screen.getByText("reducido")).toBeInTheDocument();

    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it("en el servidor vale false", () => {
    expect(renderToString(<Probe />)).toContain("normal");
  });
});
