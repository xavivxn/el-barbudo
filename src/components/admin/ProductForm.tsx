"use client";

import { CircleAlert, Plus } from "lucide-react";
import {
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useActionState,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { type FormState, saveProduct } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { SafeImage } from "@/components/ui/SafeImage";
import { isHttpsUrl, parsePrice } from "@/lib/admin-messages";
import { formatThousands } from "@/lib/money";
import { CATEGORIES, type Category, type ProductDTO } from "@/lib/types";
import { fieldErrors, parseProductForm, productSchema, slugify } from "@/lib/validation";

const initialState: FormState = {};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

type Row = {
  uid: number;
  id: string;
  label: string;
  price: string;
  stock: string;
  /** Precio y stock con los que se abrió el formulario (vacíos en variantes nuevas). */
  origPrice: string;
  origStock: string;
};

/** `uid` solo sirve de `key` de React: las filas se quitan y agregan sin mezclar sus campos. */
let lastUid = 0;
const makeRow = (data: Partial<Row> = {}): Row => ({
  uid: ++lastUid,
  id: "",
  label: "",
  price: "",
  stock: "",
  origPrice: "",
  origStock: "",
  ...data,
});

/** `variants.0.price` -> `variants-0-price`: los ids de los campos no llevan puntos. */
const idOf = (name: string) => name.replaceAll(".", "-");

/** Los tres campos de notas comparten un solo error. */
const errorKeyOf = (name: string) => (name.startsWith("notes.") ? "notes" : name);

const KNOWN_FIELD = /^(name|slug|subtitle|category|description|benefits|tags|images|notes\.(top|heart|base)|variants\.\d+\.(label|price|stock))$/;

const SECTION_ORDER = ["name", "slug", "subtitle", "category", "description", "variants", "notes", "benefits", "tags", "images"];
const VARIANT_FIELD_ORDER = ["label", "price", "stock"];

function errorOrder(key: string): number[] {
  const [head, index, field] = key.split(".");
  return [SECTION_ORDER.indexOf(head), Number(index ?? 0), VARIANT_FIELD_ORDER.indexOf(field ?? "")];
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre",
  slug: "Dirección",
  subtitle: "Subtítulo",
  category: "Categoría",
  description: "Descripción",
  variants: "Variantes",
  notes: "Notas olfativas",
  benefits: "Ingredientes o beneficios",
  tags: "Etiquetas",
  images: "Fotos",
};
const VARIANT_LABELS: Record<string, string> = { label: "tamaño", price: "precio", stock: "stock" };

function labelOfKey(key: string): string {
  const [head, index, field] = key.split(".");
  if (head === "variants" && field) return `Variante ${Number(index) + 1}, ${VARIANT_LABELS[field]}`;
  return FIELD_LABELS[head] ?? key;
}

/** Dónde aterriza el enlace del resumen para cada error. */
function targetIdOf(key: string): string {
  if (key === "notes") return "notes-top";
  if (key === "variants") return "variants-add";
  return idOf(key);
}

const inputClass = (error?: string) =>
  `min-h-12 w-full rounded-lg border bg-surface px-4 text-base text-fg ${focusRing} ${
    error ? "border-danger" : "border-line"
  }`;

type ControlProps = {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
  className: string;
};

function Field({
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

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm font-medium text-danger">
      <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      {error}
    </p>
  );
}

const legendClass = "mb-4 text-lg font-semibold";
const sectionClass = "min-w-0 border-0 p-0";

function initialValues(product?: ProductDTO) {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    subtitle: product?.subtitle ?? "",
    category: (product?.category ?? "perfume") as Category,
    description: product?.description ?? "",
    top: product?.notes?.top ?? "",
    heart: product?.notes?.heart ?? "",
    base: product?.notes?.base ?? "",
    benefits: (product?.benefits ?? []).join("\n"),
    tags: (product?.tags ?? []).join(", "),
    images: (product?.images ?? []).join("\n"),
  };
}

export function ProductForm({ product }: { product?: ProductDTO }) {
  const [state, formAction, pending] = useActionState(saveProduct, initialState);
  const [, startTransition] = useTransition();

  const [values, setValues] = useState(() => initialValues(product));
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [active, setActive] = useState(product?.active ?? true);
  // Al editar, la dirección existente no se pisa cuando cambia el nombre.
  const [slugTouched, setSlugTouched] = useState(Boolean(product));

  const [rows, setRows] = useState<Row[]>(() =>
    product && product.variants.length > 0
      ? product.variants.map((variant) =>
          makeRow({
            id: variant.id,
            label: variant.label,
            price: formatThousands(variant.price),
            stock: String(variant.stock),
            origPrice: String(variant.price),
            origStock: String(variant.stock),
          }),
        )
      : [makeRow()],
  );

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

  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    if (pendingFocus.current) {
      document.getElementById(pendingFocus.current)?.focus();
      pendingFocus.current = null;
    }
  });

  const isPerfume = values.category === "perfume";
  const set = (field: keyof typeof values) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
  };

  const photoUrls = useDeferredValue(
    values.images
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(isHttpsUrl)
      .slice(0, 12),
  );

  /** Valida un solo campo con el mismo esquema del servidor, leyendo lo que hay en el formulario. */
  function validate(target: EventTarget, onlyIfInvalid: boolean) {
    if (
      !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)
    ) {
      return;
    }
    const name = target.name;
    if (!target.form || !KNOWN_FIELD.test(name)) return;
    const key = errorKeyOf(name);
    if (onlyIfInvalid && !errors[key]) return;
    const found = fieldErrors(productSchema.safeParse(parseProductForm(new FormData(target.form))))[key];
    setErrors((current) => {
      if (current[key] === found) return current;
      const next = { ...current };
      if (found) next[key] = found;
      else delete next[key];
      return next;
    });
  }

  function onBlur(event: FocusEvent<HTMLFormElement>) {
    validate(event.target, false);
  }

  function onChange(event: ChangeEvent<HTMLFormElement>) {
    // Mientras escribe, solo se re-valida un campo que ya tenía error.
    validate(event.target, true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    // Se envía a mano (sin `action`) para que React no reinicie los campos si hay errores.
    startTransition(() => formAction(data));
  }

  function onNameChange(event: ChangeEvent<HTMLInputElement>) {
    const name = event.target.value;
    setValues((current) => ({ ...current, name, slug: slugTouched ? current.slug : slugify(name) }));
    if (!slugTouched) {
      setErrors((current) => {
        if (!current.slug) return current;
        const next = { ...current };
        delete next.slug;
        return next;
      });
    }
  }

  function onSlugChange(event: ChangeEvent<HTMLInputElement>) {
    const slug = event.target.value;
    setValues((current) => ({ ...current, slug }));
    // Si lo vacía, vuelve a seguir al nombre.
    setSlugTouched(slug !== "");
  }

  function updateRow(uid: number, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.uid === uid ? { ...row, ...patch } : row)));
  }

  function addRow() {
    pendingFocus.current = `variants-${rows.length}-label`;
    setRows((current) => [...current, makeRow()]);
  }

  function removeRow(uid: number) {
    if (rows.length <= 1) return;
    pendingFocus.current = "variants-add";
    setRows((current) => current.filter((row) => row.uid !== uid));
    // Los índices de las filas cambian: los errores de variantes se recalculan en el próximo envío.
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith("variants."))));
  }

  // El resumen es de los errores del último envío que siguen sin corregir; los de blur solo van junto al campo.
  const errorKeys = Object.keys(state.errors ?? {})
    .filter((key) => key in errors)
    .sort((a, b) => {
    const [x, y] = [errorOrder(a), errorOrder(b)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });
  const summaryVisible = errorKeys.length > 0 || Boolean(state.message);

  function jumpTo(event: MouseEvent<HTMLAnchorElement>, key: string) {
    event.preventDefault();
    // focus() ya lleva el campo a la vista.
    document.getElementById(targetIdOf(key))?.focus();
  }

  const notesDescribedBy = errors.notes ? "notes-error" : undefined;

  return (
    <form onSubmit={onSubmit} onBlur={onBlur} onChange={onChange} noValidate className="mt-6 flex flex-col gap-10">
      {product ? (
        <>
          <input type="hidden" name="productId" value={product.id} />
          <input
            type="hidden"
            name="loadedVariantIds"
            value={product.variants.map((variant) => variant.id).join(",")}
          />
        </>
      ) : null}

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
                    href={`#${targetIdOf(key)}`}
                    onClick={(event) => jumpTo(event, key)}
                    className={`underline underline-offset-4 ${focusRing}`}
                  >
                    {labelOfKey(key)}: {errors[key]}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {errorKeys.length > 0 && state.message ? <p className="mt-2">{state.message}</p> : null}
        </div>
      ) : null}

      <fieldset className={`${sectionClass} flex flex-col gap-5`}>
        <legend className={legendClass}>Datos básicos</legend>
        <Field id="name" label="Nombre" error={errors.name}>
          {(a11y) => (
            <input {...a11y} name="name" type="text" value={values.name} onChange={onNameChange} autoComplete="off" />
          )}
        </Field>
        <Field
          id="slug"
          label="Dirección"
          hint={`Así se ve en la tienda: /productos/${values.slug || "…"}`}
          error={errors.slug}
        >
          {(a11y) => (
            <input
              {...a11y}
              name="slug"
              type="text"
              value={values.slug}
              onChange={onSlugChange}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          )}
        </Field>
        <Field id="subtitle" label="Subtítulo" hint="Por ejemplo: Eau de parfum, 30 ml." error={errors.subtitle}>
          {(a11y) => (
            <input {...a11y} name="subtitle" type="text" value={values.subtitle} onChange={set("subtitle")} autoComplete="off" />
          )}
        </Field>
        <Field id="category" label="Categoría" error={errors.category}>
          {(a11y) => (
            <select {...a11y} name="category" value={values.category} onChange={set("category")}>
              {CATEGORIES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id="description" label="Descripción" error={errors.description}>
          {(a11y) => (
            <textarea
              {...a11y}
              name="description"
              rows={5}
              value={values.description}
              onChange={set("description")}
              className={`${a11y.className} py-3`}
            />
          )}
        </Field>
      </fieldset>

      <fieldset className={sectionClass}>
        <legend className={legendClass}>Variantes</legend>
        <p className="-mt-2 mb-4 text-sm text-muted">
          Cada tamaño o presentación tiene su precio y su stock. Un producto necesita al menos una.
        </p>
        <div className="flex flex-col gap-5">
          {rows.map((row, index) => {
            const base = `variants.${index}`;
            return (
              <div
                key={row.uid}
                role="group"
                aria-label={`Variante ${index + 1}`}
                className="grid grid-cols-2 items-start gap-3 border-t border-line pt-5 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_9rem_6rem_auto]"
              >
                <input type="hidden" name={`${base}.id`} value={row.id} />
                {row.id ? (
                  <>
                    <input type="hidden" name={`${base}.origPrice`} value={row.origPrice} />
                    <input type="hidden" name={`${base}.origStock`} value={row.origStock} />
                  </>
                ) : null}
                <Field
                  id={idOf(`${base}.label`)}
                  label="Tamaño o presentación"
                  error={errors[`${base}.label`]}
                  className="col-span-2 sm:col-span-1"
                >
                  {(a11y) => (
                    <input
                      {...a11y}
                      name={`${base}.label`}
                      type="text"
                      value={row.label}
                      onChange={(event) => updateRow(row.uid, { label: event.target.value })}
                      placeholder="100 ml"
                      autoComplete="off"
                    />
                  )}
                </Field>
                <Field id={idOf(`${base}.price`)} label="Precio (₲)" error={errors[`${base}.price`]}>
                  {(a11y) => (
                    <input
                      {...a11y}
                      name={`${base}.price`}
                      type="text"
                      inputMode="numeric"
                      value={row.price}
                      onChange={(event) => updateRow(row.uid, { price: event.target.value })}
                      onBlur={() => {
                        const parsed = parsePrice(row.price);
                        if (parsed !== null) updateRow(row.uid, { price: formatThousands(parsed) });
                      }}
                      placeholder="285.000"
                      autoComplete="off"
                    />
                  )}
                </Field>
                <Field id={idOf(`${base}.stock`)} label="Stock" error={errors[`${base}.stock`]}>
                  {(a11y) => (
                    <input
                      {...a11y}
                      name={`${base}.stock`}
                      type="text"
                      inputMode="numeric"
                      value={row.stock}
                      onChange={(event) => updateRow(row.uid, { stock: event.target.value })}
                      placeholder="0"
                      autoComplete="off"
                    />
                  )}
                </Field>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={rows.length === 1}
                  onClick={() => removeRow(row.uid)}
                  aria-label={`Quitar variante ${index + 1}`}
                  className="col-span-2 sm:col-span-1 sm:mt-[1.875rem]"
                >
                  Quitar
                </Button>
              </div>
            );
          })}
        </div>
        <FieldError id="variants-error" error={errors.variants} />
        <Button id="variants-add" size="sm" variant="secondary" onClick={addRow} className="mt-5">
          <Plus size={18} aria-hidden="true" />
          Agregar variante
        </Button>
      </fieldset>

      <section hidden={!isPerfume}>
        <fieldset disabled={!isPerfume} className={sectionClass}>
          <legend className={legendClass}>Notas olfativas</legend>
          <p className="-mt-2 mb-4 text-sm text-muted">
            Completá las tres o dejalas todas vacías.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {(
              [
                ["top", "Salida"],
                ["heart", "Corazón"],
                ["base", "Fondo"],
              ] as const
            ).map(([field, label]) => (
              <Field key={field} id={`notes-${field}`} label={label}>
                {(a11y) => (
                  <input
                    {...a11y}
                    aria-invalid={errors.notes ? true : undefined}
                    aria-describedby={notesDescribedBy}
                    className={inputClass(errors.notes)}
                    name={`notes.${field}`}
                    type="text"
                    value={values[field]}
                    onChange={set(field)}
                    autoComplete="off"
                  />
                )}
              </Field>
            ))}
          </div>
          <div className="mt-2">
            <FieldError id="notes-error" error={errors.notes} />
          </div>
        </fieldset>
      </section>

      <section hidden={isPerfume}>
        <fieldset disabled={isPerfume} className={sectionClass}>
          <legend className={legendClass}>Ingredientes o beneficios</legend>
          <Field
            id="benefits"
            label="Uno por línea"
            optional
            error={errors.benefits}
          >
            {(a11y) => (
              <textarea
                {...a11y}
                name="benefits"
                rows={4}
                value={values.benefits}
                onChange={set("benefits")}
                className={`${a11y.className} py-3`}
              />
            )}
          </Field>
        </fieldset>
      </section>

      <fieldset className={sectionClass}>
        <legend className={legendClass}>Etiquetas</legend>
        <Field
          id="tags"
          label="Separadas por coma"
          optional
          hint="Por ejemplo: amaderado, noche. Sirven para filtrar en la tienda."
          error={errors.tags}
        >
          {(a11y) => (
            <input {...a11y} name="tags" type="text" value={values.tags} onChange={set("tags")} autoComplete="off" />
          )}
        </Field>
      </fieldset>

      <fieldset className={sectionClass}>
        <legend className={legendClass}>Fotos</legend>
        <Field
          id="images"
          label="Direcciones de las fotos, una por línea"
          optional
          hint="Cada una tiene que empezar con https://. La primera es la principal."
          error={errors.images}
        >
          {(a11y) => (
            <textarea
              {...a11y}
              name="images"
              rows={4}
              value={values.images}
              onChange={set("images")}
              autoCapitalize="none"
              spellCheck={false}
              className={`${a11y.className} py-3`}
            />
          )}
        </Field>
        {photoUrls.length > 0 ? (
          <ul aria-label="Vista previa de las fotos" className="mt-4 flex flex-wrap gap-3">
            {photoUrls.map((url, index) => (
              <li key={`${index}-${url}`} className="relative size-20 overflow-hidden border border-line bg-surface">
                <SafeImage src={url} alt={`Foto ${index + 1}`} fill sizes="80px" unoptimized className="object-cover" />
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>

      <fieldset className={sectionClass}>
        <legend className={legendClass}>Visibilidad</legend>
        <div className="flex flex-col gap-2">
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="featured"
              checked={featured}
              onChange={(event) => setFeatured(event.target.checked)}
              className={`mt-3 size-5 shrink-0 accent-fg ${focusRing}`}
            />
            <span className="py-2">
              <span className="font-medium">Destacado</span>
              <span className="block text-sm text-muted">Aparece en la portada de la tienda.</span>
            </span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="active"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className={`mt-3 size-5 shrink-0 accent-fg ${focusRing}`}
            />
            <span className="py-2">
              <span className="font-medium">Activo</span>
              <span className="block text-sm text-muted">Si lo desactivás, el producto deja de verse en la tienda.</span>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button
          type="submit"
          aria-disabled={pending}
          onClick={(event) => {
            if (pending) event.preventDefault();
          }}
          className={pending ? "opacity-70" : ""}
        >
          {pending ? "Guardando…" : "Guardar producto"}
        </Button>
        <Button href="/admin" variant="secondary">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
