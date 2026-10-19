"use client";

import { CircleAlert } from "lucide-react";
import { type MouseEvent, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import type { FormState } from "@/app/admin/actions";

/** Piezas que comparten los formularios del admin (producto y servicio). */

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export const inputClass = (error?: string) =>
  `min-h-12 w-full rounded-lg border bg-surface px-4 text-base text-fg ${focusRing} ${
    error ? "border-danger" : "border-line"
  }`;

export type ControlProps = {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
  className: string;
};

/** Etiqueta arriba, pista opcional, el control y el error con `aria-invalid` / `aria-describedby`. */
export function Field({
  id,
  label,
  optional,
  hint,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: (props: ControlProps) => ReactNode;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="font-medium">
        {label}
        {optional ? <span className="font-normal text-muted"> (opcional)</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
        className: inputClass(error),
      })}
      <FieldError id={errorId} error={error} />
    </div>
  );
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm font-medium text-danger">
      <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      {error}
    </p>
  );
}

export type SummaryItem = {
  key: string;
  /** Id del control al que lleva el enlace. */
  targetId: string;
  label: string;
  error: string;
};

/** Resumen tras un envío con errores: cuenta, enlaces a cada campo y el mensaje general si hay. */
export function ErrorSummary({
  summaryRef,
  items,
  message,
}: {
  summaryRef: RefObject<HTMLDivElement | null>;
  items: SummaryItem[];
  message?: string;
}) {
  if (items.length === 0 && !message) return null;

  function jumpTo(event: MouseEvent<HTMLAnchorElement>, targetId: string) {
    event.preventDefault();
    // focus() ya lleva el campo a la vista.
    document.getElementById(targetId)?.focus();
  }

  return (
    <div ref={summaryRef} role="alert" tabIndex={-1} className={`border-2 border-danger bg-surface p-4 ${focusRing}`}>
      <p className="flex items-center gap-2 font-semibold text-danger">
        <CircleAlert size={20} aria-hidden="true" className="shrink-0" />
        {items.length > 0
          ? items.length === 1
            ? "Hay 1 campo para revisar"
            : `Hay ${items.length} campos para revisar`
          : message}
      </p>
      {items.length > 0 ? (
        <ul className="mt-2 list-disc pl-6">
          {items.map(({ key, targetId, label, error }) => (
            <li key={key}>
              <a
                href={`#${targetId}`}
                onClick={(event) => jumpTo(event, targetId)}
                className={`underline underline-offset-4 ${focusRing}`}
              >
                {label}: {error}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {items.length > 0 && message ? <p className="mt-2">{message}</p> : null}
    </div>
  );
}

/**
 * Errores de un formulario con Server Action.
 *
 * Las respuestas del servidor reemplazan los errores y llevan el foco al resumen; después cada campo
 * se valida por su cuenta. `validateForm` corre el mismo esquema que el servidor y `keyOf` traduce el
 * `name` de un control a la clave de su error (o `null` si no es un campo conocido).
 */
export function useFieldErrors(
  state: FormState,
  validateForm: (form: FormData) => Record<string, string>,
  keyOf: (name: string) => string | null,
) {
  const [seenState, setSeenState] = useState(state);
  const [errors, setErrors] = useState<Record<string, string>>(state.errors ?? {});
  if (state !== seenState) {
    setSeenState(state);
    setErrors(state.errors ?? {});
  }

  const summaryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.errors || state.message) summaryRef.current?.focus();
  }, [state]);

  /** Valida un solo campo leyendo lo que hay en el formulario. */
  function validate(target: EventTarget, onlyIfInvalid: boolean) {
    if (
      !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)
    ) {
      return;
    }
    const key = keyOf(target.name);
    if (!target.form || key === null) return;
    if (onlyIfInvalid && !errors[key]) return;
    const found = validateForm(new FormData(target.form))[key];
    setErrors((current) => {
      if (current[key] === found) return current;
      const next = { ...current };
      if (found) next[key] = found;
      else delete next[key];
      return next;
    });
  }

  // El resumen es de los errores del último envío que siguen sin corregir; los de blur solo van junto al campo.
  const summaryKeys = Object.keys(state.errors ?? {}).filter((key) => key in errors);

  return { errors, setErrors, summaryRef, validate, summaryKeys };
}
