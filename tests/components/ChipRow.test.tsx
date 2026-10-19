import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChipRow } from "@/components/ui/ChipRow";

describe("ChipRow", () => {
  const original = window.HTMLElement.prototype.scrollIntoView;
  afterEach(() => {
    window.HTMLElement.prototype.scrollIntoView = original;
  });

  it("al enfocar un chip lo desplaza hasta verse completo", () => {
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    render(
      <ChipRow>
        <li>
          <a href="/uno">Uno</a>
        </li>
      </ChipRow>,
    );

    fireEvent.focus(screen.getByRole("link", { name: "Uno" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ inline: "nearest", block: "nearest" });
  });
});
