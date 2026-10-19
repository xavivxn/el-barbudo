import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "accent" | "whatsapp";
type Size = "md" | "sm";

type BaseProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children?: ReactNode;
};

type AnchorProps = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps | "href"> & { href: string };

type NativeButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & { href?: undefined };

export type ButtonProps = AnchorProps | NativeButtonProps;

const variants: Record<Variant, string> = {
  primary: "bg-fg text-bg hover:opacity-85",
  secondary: "border border-fg text-fg hover:bg-fg hover:text-bg",
  // Bronce solo como fondo, con texto oscuro encima.
  accent: "bg-accent text-[#141414] hover:brightness-110",
  whatsapp: "bg-whatsapp text-[#0B2A17] hover:brightness-95",
};

const sizes: Record<Size, string> = {
  md: "min-h-12 px-7 text-base",
  sm: "min-h-11 px-5 text-sm",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,color,opacity,filter] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (rest.href !== undefined) {
    const { href, ...anchor } = rest as Omit<AnchorProps, keyof BaseProps>;
    // Rutas internas usan navegación del cliente; el resto (wa.me, mailto, mapas) va como <a> plano.
    if (href.startsWith("/")) {
      return (
        <Link href={href} className={classes} {...anchor}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className={classes} {...anchor}>
        {children}
      </a>
    );
  }

  const { type, ...button } = rest as Omit<NativeButtonProps, keyof BaseProps>;
  return (
    <button type={type ?? "button"} className={classes} {...button}>
      {children}
    </button>
  );
}
