import type { ButtonHTMLAttributes, MouseEvent, ReactNode, Ref } from "react";
import { focusRing } from "@/components/ui/focus";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "aria-label" | "aria-disabled" | "disabled"> & {
  /** Nombre accesible (el ícono va con `aria-hidden`). */
  label: string;
  /**
   * Inactivo con `aria-disabled` en vez de `disabled` nativo: sigue enfocable (el foco no se pierde
   * al llegar a un extremo) y el clic no hace nada.
   */
  disabled?: boolean;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
};

const base = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-fg transition-[color,background-color,border-color,opacity] duration-200 ${focusRing}`;
const enabled = "cursor-pointer hover:border-fg hover:bg-fg hover:text-bg";
const inactive = "cursor-not-allowed opacity-40";

/** Botón redondo de 44 px con un ícono: flechas de la vitrina y del buscador, pausa de la vitrina. */
export function IconButton({ label, disabled = false, className = "", onClick, ref, children, ...rest }: IconButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (disabled) return;
    onClick?.(event);
  }

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      aria-label={label}
      aria-disabled={disabled}
      onClick={handleClick}
      className={`${base} ${disabled ? inactive : enabled} ${className}`}
    >
      {children}
    </button>
  );
}
