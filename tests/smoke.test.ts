import { describe, expect, it } from "vitest";
import { site } from "@/site";

describe("smoke", () => {
  it("suma", () => {
    expect(1 + 1).toBe(2);
  });

  it("resuelve el alias @/", () => {
    expect(site.name).toBe("El Barbudo");
  });
});
