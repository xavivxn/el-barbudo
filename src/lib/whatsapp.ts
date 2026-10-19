import { formatPYG } from "@/lib/money";
import { site } from "@/site";

export type OrderLine = {
  name: string;
  variantLabel?: string | null;
  quantity: number;
  unitPrice: number;
};

export function buildOrderMessage(lines: OrderLine[]): string {
  const items = lines.map((line) => {
    const variant = line.variantLabel ? ` (${line.variantLabel})` : "";
    return `• ${line.quantity} × ${line.name}${variant} — ${formatPYG(line.quantity * line.unitPrice)}`;
  });
  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  return ["Hola El Barbudo 👋 Quiero pedir:", ...items, `Total: ${formatPYG(total)}`].join("\n");
}

export function buildInquiryMessage(productName: string): string {
  return `Hola El Barbudo, ¿tienen disponible ${productName}?`;
}

export function buildBookingMessage(serviceName: string): string {
  return `Hola El Barbudo, quiero reservar un turno para ${serviceName}`;
}

export function whatsappUrl(text: string, phone?: string): string {
  const digits = (phone ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  const number = digits || site.whatsapp.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
