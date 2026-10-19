import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IconButton } from "@/components/ui/IconButton";

afterEach(cleanup);

describe("IconButton", () => {
  it("es un botón redondo de 44 px con nombre accesible y anillo de foco", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton label="Destacado siguiente" onClick={onClick}>
        <svg aria-hidden="true" />
      </IconButton>,
    );

    const button = screen.getByRole("button", { name: "Destacado siguiente" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("h-11", "w-11", "rounded-full", "cursor-pointer", "focus-visible:outline-accent");
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("con aria-disabled sigue enfocable, se ve inactivo y no ejecuta el clic", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton label="Perfumes anteriores" disabled onClick={onClick}>
        <svg aria-hidden="true" />
      </IconButton>,
    );

    const button = screen.getByRole("button", { name: "Perfumes anteriores" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toHaveAttribute("disabled");
    expect(button).toHaveClass("cursor-not-allowed", "opacity-40");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
    // Sin `disabled` nativo el foco queda en el botón (no cae al <body>).
    expect(button).toHaveFocus();
  });
});
