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
    expect(parseGuaranies("1.250.000")).toBe(1250000);
  });

  it("rechaza valores inválidos", () => {
    for (const bad of ["", "-5", "12,5", "abc", "1.2.3a", "12.5", "1.2.3", "1.2345", "99999999999999999999", "2.000.000.001", "1.250 000"]) {
      expect(parseGuaranies(bad)).toBeNull();
    }
  });
});
