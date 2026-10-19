import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ChipProps = {
  href?: string;
  active?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

const base =
  "inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function Chip({ href, active = false, className = "", children, ...rest }: ChipProps) {
  const tone = active
    ? "border-fg bg-fg text-bg"
    : "border-line text-fg hover:border-fg";
  const classes = `${base} ${tone} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} aria-current={active ? "true" : undefined}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} aria-pressed={active} {...rest}>
      {children}
    </button>
  );
}
