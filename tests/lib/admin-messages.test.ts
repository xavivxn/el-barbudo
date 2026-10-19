import { describe, expect, it } from "vitest";
import { isHttpsUrl, parsePrice, parseStock } from "@/lib/admin-messages";

describe("parsePrice", () => {
  it.each([
    ["285.000", 285000],
    ["285000", 285000],
    [" 285 000 ", 285000],
    ["1", 1],
  ])("acepta %j", (input, expected) => expect(parsePrice(input)).toBe(expected));

  it.each(["0", "-5", "12,5", "12.5", "", "abc", "2.000.000.001"])("rechaza %j", (input) =>
    expect(parsePrice(input)).toBeNull(),
  );

  it("rechaza lo que no es texto", () => {
    expect(parsePrice(100)).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
  });
});

describe("parseStock", () => {
  it.each([
    ["0", 0],
    ["4", 4],
    ["1.000", 1000],
  ])("acepta %j", (input, expected) => expect(parseStock(input)).toBe(expected));

  it.each(["-1", "1,5", "", "x"])("rechaza %j", (input) => expect(parseStock(input)).toBeNull());

  it("rechaza lo que no es texto", () => expect(parseStock(3)).toBeNull());
});

describe("isHttpsUrl", () => {
  it.each(["https://x.com/a.jpg", "https://images.unsplash.com/photo-1?w=1200"])("acepta %j", (url) =>
    expect(isHttpsUrl(url)).toBe(true),
  );

  it.each(["http://x.com/a.jpg", "x.com/a.jpg", "https://", "javascript:alert(1)", "ftp://x.com", ""])(
    "rechaza %j",
    (url) => expect(isHttpsUrl(url)).toBe(false),
  );
});
