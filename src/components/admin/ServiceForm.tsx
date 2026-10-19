"use client";

import {
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { FormState } from "@/app/admin/actions";
import { saveService } from "@/app/admin/service-actions";
import { ErrorSummary, Field, useFieldErrors, withSaveFallback } from "@/components/admin/form-parts";
import { Button } from "@/components/ui/Button";
import { formatThousands } from "@/lib/money";
import type { ServiceDTO } from "@/lib/types";
import { fieldErrors, parseServiceForm, serviceSchema } from "@/lib/validation";

const initialState: FormState = {};
/** Un fallo de red no tira la página: queda como mensaje y lo escrito sigue en el formulario. */
const save = withSaveFallback(saveService);

const FIELDS = ["name", "description", "price"] as const;
type FieldName = (typeof FIELDS)[number];
const LABELS: Record<FieldName, string> = { name: "Nombre", description: "Descripción", price: "Precio" };

type Props = {
  /** Sin `service` crea uno nuevo. */
  service?: ServiceDTO;
  /** Id del elemento que contiene el formulario: prefijo de los ids de sus campos. */
  formId: string;
  onSaved: () => void;
  /** El servidor devolvió errores o un mensaje: no se guardó. */
  onFailed: () => void;
  onCancel: () => void;
};

export function ServiceForm({ service, formId, onSaved, onFailed, onCancel }: Props) {
  const [state, formAction, pending] = useActionState(save, initialState);
  const [, startTransition] = useTransition();

  const [values, setValues] = useState({
    name: service?.name ?? "",
    description: service?.description ?? "",
    price: service ? formatThousands(service.price) : "",
  });

  const { errors, summaryRef, validate, summaryKeys } = useFieldErrors(
    state,
    (form) => fieldErrors(serviceSchema.safeParse(parseServiceForm(form))),
    (name) => (FIELDS.includes(name as FieldName) ? name : null),
  );

  // El padre cierra el formulario y avisa (guardó) o borra el aviso anterior (no guardó).
  const callbacks = useRef({ onSaved, onFailed });
  useEffect(() => {
    callbacks.current = { onSaved, onFailed };
  });
  useEffect(() => {
    if (state.saved) callbacks.current.onSaved();
    else if (state.errors || state.message) callbacks.current.onFailed();
  }, [state]);

  // Al abrirse, el foco entra al primer campo.
  useEffect(() => {
    document.getElementById(`${formId}-name`)?.focus();
  }, [formId]);

  const set = (field: FieldName) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
  };

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    // Se envía a mano (sin `action`) para que React no reinicie los campos si hay errores.
    startTransition(() => formAction(data));
  }

  const summaryItems = FIELDS.filter((key) => summaryKeys.includes(key)).map((key) => ({
    key,
    targetId: `${formId}-${key}`,
    label: LABELS[key],
    error: errors[key],
  }));

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

      <ErrorSummary summaryRef={summaryRef} items={summaryItems} message={state.message} />

      <Field id={`${formId}-name`} label={LABELS.name} error={errors.name}>
        {(a11y) => (
          <input {...a11y} name="name" type="text" value={values.name} onChange={set("name")} autoComplete="off" />
        )}
      </Field>

      <Field id={`${formId}-description`} label={LABELS.description} optional error={errors.description}>
        {(a11y) => (
          <textarea
            {...a11y}
            name="description"
            rows={3}
            value={values.description}
            onChange={set("description")}
            className={`${a11y.className} py-3`}
          />
        )}
      </Field>

      <Field
        id={`${formId}-price`}
        label={LABELS.price}
        hint="En guaraníes, sin decimales. Por ejemplo 120.000."
        error={errors.price}
      >
        {(a11y) => (
          <input
            {...a11y}
            name="price"
            type="text"
            inputMode="numeric"
            value={values.price}
            onChange={set("price")}
            autoComplete="off"
            className={`${a11y.className} tabular-nums sm:max-w-56`}
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
