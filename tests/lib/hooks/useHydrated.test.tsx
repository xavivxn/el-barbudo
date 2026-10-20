import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { useHydrated } from "@/lib/hooks/useHydrated";

function Probe() {
  return <p>{useHydrated() ? "con JS" : "sin JS"}</p>;
}

afterEach(cleanup);

describe("useHydrated", () => {
  it("es false en el HTML del servidor", () => {
    expect(renderToString(<Probe />)).toContain("sin JS");
  });

  it("es true una vez montado en el cliente", () => {
    render(<Probe />);
    expect(screen.getByText("con JS")).toBeInTheDocument();
  });
});
