import { describe, expect, it } from "vitest";
import { formatPYG, parseGuaranies } from "@/lib/money";

describe("formatPYG", () => {
  it("formatea guaraníes con punto como separador de miles", () => {
    expect(formatPYG(285000)).toBe("₲ 285.000");
    expect(formatPYG(0)).toBe("₲ 0");
    expect(formatPYG(1250000)).toBe("₲ 1.250.000");
  });
});

describe("parseGuaranies", () => {
  it("acepta números escritos como los lee el admin", () => {
    expect(parseGuaranies("285.000")).toBe(285000);
    expect(parseGuaranies(" 285 000 ")).toBe(285000);
    expect(parseGuaranies("285000")).toBe(285000);
    expect(parseGuaranies("0")).toBe(0);
  });

  it("rechaza valores inválidos", () => {
    for (const bad of ["", "-5", "12,5", "abc", "1.2.3a"]) {
      expect(parseGuaranies(bad)).toBeNull();
    }
  });
});
