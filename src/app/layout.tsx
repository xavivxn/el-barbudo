import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { MotionProvider } from "@/components/MotionProvider";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "El Barbudo — Barbería y perfumería",
  description:
    "Barbería y perfumería en Asunción. Mirá los productos y armá tu pedido por WhatsApp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${cormorant.variable} ${inter.variable}`}
    >
      <head>
        {/* Sin JS, motion no anima la entrada: lo que va con <Reveal> se muestra igual. */}
        <noscript>
          <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
        </noscript>
      </head>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <MotionProvider>{children}</MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
