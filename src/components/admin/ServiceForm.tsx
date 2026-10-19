"use client";

import { CircleAlert } from "lucide-react";
import {
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { FormState } from "@/app/admin/actions";
import { saveService } from "@/app/admin/service-actions";
import { Button } from "@/components/ui/Button";
import { formatThousands } from "@/lib/money";
import type { ServiceDTO } from "@/lib/types";
import { fieldErrors, parseServiceForm, serviceSchema } from "@/lib/validation";

const initialState: FormState = {};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const FIELDS = ["name", "description", "price"] as const;
type FieldName = (typeof FIELDS)[number];
const LABELS: Record<FieldName, string> = { name: "Nombre", description: "Descripción", price: "Precio" };

const inputClass = (error?: string) =>
  `w-full rounded-lg border bg-bg px-4 text-base text-fg ${focusRing} ${error ? "border-danger" : "border-line"}`;

type ControlProps = {
  id: string;
  name: FieldName;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
  className: string;
};

function Field({
  formId,
  name,
  optional,
  hint,
  error,
  children,
}: {
  formId: string;
  name: FieldName;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = `${formId}-${name}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {LABELS[name]}
        {optional ? <span className="font-normal text-muted"> (opcional)</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {children({
        id,
        name,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
        className: inputClass(error),
      })}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-danger">
          <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

type Props = {
  /** Sin `service` crea uno nuevo. */
  service?: ServiceDTO;
  /** Orden con el que se abre el formulario; el servidor lo recalcula al crear. */
  nextOrder: number;
  /** Id del elemento que contiene el formulario: prefijo de los ids de sus campos. */
  formId: string;
  onSaved: () => void;
  onCancel: () => void;
};

export function ServiceForm({ service, nextOrder, formId, onSaved, onCancel }: Props) {
  const [state, formAction, pending] = useActionState(saveService, initialState);
  const [, startTransition] = useTransition();

  const [values, setValues] = useState({
    name: service?.name ?? "",
    description: service?.description ?? "",
    price: service ? formatThousands(service.price) : "",
  });

  // Las respuestas del servidor reemplazan los errores; después cada campo se valida por su cuenta.
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

  // Guardó: el padre cierra el formulario y devuelve el foco.
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });
  useEffect(() => {
    if (state.saved) onSavedRef.current();
  }, [state]);

  // Al abrirse, el foco entra al primer campo.
  useEffect(() => {
    document.getElementById(`${formId}-name`)?.focus();
  }, [formId]);

  const set = (field: FieldName) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
  };

  /** Valida un solo campo con el mismo esquema del servidor. */
  function validate(target: EventTarget, onlyIfInvalid: boolean) {
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    const key = target.name;
    if (!target.form || !FIELDS.includes(key as FieldName)) return;
    if (onlyIfInvalid && !errors[key]) return;
    const found = fieldErrors(serviceSchema.safeParse(parseServiceForm(new FormData(target.form))))[key];
    setErrors((current) => {
      if (current[key] === found) return current;
      const next = { ...current };
      if (found) next[key] = found;
      else delete next[key];
      return next;
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    // Se envía a mano (sin `action`) para que React no reinicie los campos si hay errores.
    startTransition(() => formAction(data));
  }

  // El resumen es de los errores del último envío que siguen sin corregir; los de blur solo van junto al campo.
  const errorKeys = FIELDS.filter((key) => key in (state.errors ?? {}) && key in errors);
  const summaryVisible = errorKeys.length > 0 || Boolean(state.message);

  function jumpTo(event: MouseEvent<HTMLAnchorElement>, key: FieldName) {
    event.preventDefault();
    document.getElementById(`${formId}-${key}`)?.focus();
  }

  return (
    <form
      onSubmit={onSubmit}
      onBlur={(event: FocusEvent<HTMLFormElement>) => validate(event.target, false)}
      onChange={(event: ChangeEvent<HTMLFormElement>) => validate(event.target, true)}
      noValidate
      aria-label={service ? `Editar ${service.name}` : "Nuevo servicio"}
      className="flex flex-col gap-5"
    >
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      <input type="hidden" name="order" value={service?.order ?? nextOrder} />

      {summaryVisible ? (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          className={`border-2 border-danger bg-surface p-4 ${focusRing}`}
        >
          <p className="flex items-center gap-2 font-semibold text-danger">
            <CircleAlert size={20} aria-hidden="true" className="shrink-0" />
            {errorKeys.length > 0
              ? errorKeys.length === 1
                ? "Hay 1 campo para revisar"
                : `Hay ${errorKeys.length} campos para revisar`
              : state.message}
          </p>
          {errorKeys.length > 0 ? (
            <ul className="mt-2 list-disc pl-6">
              {errorKeys.map((key) => (
                <li key={key}>
                  <a
                    href={`#${formId}-${key}`}
                    onClick={(event) => jumpTo(event, key)}
                    className={`underline underline-offset-4 ${focusRing}`}
                  >
                    {LABELS[key]}: {errors[key]}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {errorKeys.length > 0 && state.message ? <p className="mt-2">{state.message}</p> : null}
        </div>
      ) : null}

      <Field formId={formId} name="name" error={errors.name}>
        {(a11y) => (
          <input {...a11y} type="text" value={values.name} onChange={set("name")} autoComplete="off" className={`${a11y.className} min-h-12`} />
        )}
      </Field>

      <Field formId={formId} name="description" optional error={errors.description}>
        {(a11y) => (
          <textarea {...a11y} rows={3} value={values.description} onChange={set("description")} className={`${a11y.className} py-3`} />
        )}
      </Field>

      <Field formId={formId} name="price" hint="En guaraníes, sin decimales. Por ejemplo 120.000." error={errors.price}>
        {(a11y) => (
          <input
            {...a11y}
            type="text"
            inputMode="numeric"
            value={values.price}
            onChange={set("price")}
            autoComplete="off"
            className={`${a11y.className} min-h-12 tabular-nums sm:max-w-56`}
          />
        )}
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          aria-disabled={pending}
          onClick={(event) => {
            if (pending) event.preventDefault();
          }}
          className={pending ? "opacity-70" : ""}
        >
          {pending ? "Guardando…" : "Guardar servicio"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
