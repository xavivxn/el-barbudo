import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildBookingMessage,
  buildInquiryMessage,
  buildOrderMessage,
  whatsappUrl,
} from "@/lib/whatsapp";
import { site } from "@/site";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("mensajes de WhatsApp", () => {
  it("arma el pedido con variante opcional y total", () => {
    const lines = [
      { name: "Noir Intense", variantLabel: "100 ml", quantity: 1, unitPrice: 285000 },
      { name: "Aceite de barba", quantity: 2, unitPrice: 95000 },
    ];
    expect(buildOrderMessage(lines)).toBe(
      "Hola El Barbudo 👋 Quiero pedir:\n" +
        "• 1 × Noir Intense (100 ml) — ₲ 285.000\n" +
        "• 2 × Aceite de barba — ₲ 190.000\n" +
        "Total: ₲ 475.000",
    );
  });

  it("omite el paréntesis si la variante es vacía", () => {
    expect(
      buildOrderMessage([{ name: "Cera", variantLabel: "", quantity: 1, unitPrice: 1000 }]),
    ).toContain("• 1 × Cera — ₲ 1.000\n");
  });

  it("arma consulta y reserva", () => {
    expect(buildInquiryMessage("Noir Intense")).toBe(
      "Hola El Barbudo, ¿tienen disponible Noir Intense?",
    );
    expect(buildBookingMessage("Corte + barba")).toBe(
      "Hola El Barbudo, quiero reservar un turno para Corte + barba",
    );
  });
});

describe("whatsappUrl", () => {
  it("limpia el número a solo dígitos", () => {
    expect(whatsappUrl("a", "+595 000 111-222")).toBe("https://wa.me/595000111222?text=a");
  });

  it("conserva caracteres especiales intactos", () => {
    const tricky = "Café & Co #1?\nsí 👋";
    const url = whatsappUrl(tricky, "595000111222");
    expect(new URL(url).searchParams.get("text")).toBe(tricky);
  });

  it("usa la variable de entorno si no se pasa número", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+595 971 000-111");
    expect(whatsappUrl("a")).toBe("https://wa.me/595971000111?text=a");
  });

  it("usa site.whatsapp si no hay número ni variable", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "");
    expect(whatsappUrl("a")).toBe(`https://wa.me/${site.whatsapp.replace(/\D/g, "")}?text=a`);
  });

  it("usa site.whatsapp si la variable no tiene dígitos", () => {
    const expected = `https://wa.me/${site.whatsapp.replace(/\D/g, "")}?text=a`;
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "  ");
    expect(whatsappUrl("a")).toBe(expected);
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "TBD");
    expect(whatsappUrl("a")).toBe(expected);
  });
});
