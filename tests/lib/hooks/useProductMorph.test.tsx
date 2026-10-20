import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useProductMorph } from "@/lib/hooks/useProductMorph";
import { resetMorph } from "@/lib/morph";

const renders = new Map<string, number>();

/** Cuenta sus renders: armar una instancia no debe re-renderizar las demás. */
function Probe({ label, slug }: { label: string; slug: string }) {
  const morph = useProductMorph(slug);
  renders.set(label, (renders.get(label) ?? 0) + 1);
  return (
    <a href={`/productos/${slug}`} data-name={morph.name ?? ""} {...morph.handlers}>
      {label}
    </a>
  );
}

afterEach(() => {
  cleanup();
  act(() => resetMorph());
  renders.clear();
});

describe("useProductMorph", () => {
  it("armar una instancia re-renderiza solo esa (y la que suelta el nombre), no las demás", () => {
    render(
      <>
        <Probe label="a" slug="bleu" />
        <Probe label="b" slug="bleu" />
        <Probe label="c" slug="aventus" />
      </>,
    );
    const before = new Map(renders);

    fireEvent.keyDown(screen.getByText("a"), { key: "Enter" });
    expect(screen.getByText("a")).toHaveAttribute("data-name", "producto-bleu");
    expect(renders.get("b")).toBe(before.get("b"));
    expect(renders.get("c")).toBe(before.get("c"));

    // El nombre pasa a "c": se re-renderizan "a" (lo suelta) y "c" (lo toma); "b" no.
    const middle = new Map(renders);
    fireEvent.keyDown(screen.getByText("c"), { key: "Enter" });
    expect(screen.getByText("a")).toHaveAttribute("data-name", "");
    expect(screen.getByText("c")).toHaveAttribute("data-name", "producto-aventus");
    expect(renders.get("b")).toBe(middle.get("b"));
  });
});
