import type { Metadata } from "next";
import type { ReactNode } from "react";

// El admin nunca se indexa. Solo usa el layout raíz (tema, fuentes), sin cabecera ni pie de la tienda.
export const metadata: Metadata = {
  title: { default: "Admin — El Barbudo", template: "%s — Admin El Barbudo" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="font-sans">{children}</div>;
}
