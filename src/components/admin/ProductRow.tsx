"use client";

import { Check, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import { markSoldOut, toggleProductFlag, updateVariant } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { SafeImage } from "@/components/ui/SafeImage";
import { parsePrice, parseStock, PRICE_ERROR, STOCK_ERROR } from "@/lib/admin-messages";
import { formatThousands } from "@/lib/money";
import { isSoldOut } from "@/lib/stock";
import { CATEGORIES, type ProductDTO, type VariantDTO } from "@/lib/types";

const SAVED_VISIBLE_MS = 2000;
const GENERIC_ERROR = "No se pudo guardar. Probá de nuevo.";

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

type NumberFieldProps = {
  id: string;
  label: string;
  kind: "price" | "stock";
  /** Valor guardado en la base. */
  saved: number;
  onSave: (value: string) => Promise<{ ok: true } | { error: string }>;
};

/** Campo numérico que guarda al perder el foco o con Enter, y solo si el valor cambió. */
function InlineNumberField({ id, label, kind, saved, onSave }: NumberFieldProps) {
  const format = kind === "price" ? formatThousands : String;
  const [text, setText] = useState(format(saved));
  const [savedValue, setSavedValue] = useState(saved);
  const [seenProp, setSeenProp] = useState(saved);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const pending = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const errorId = `${id}-error`;

  useEffect(() => () => clearTimeout(timer.current), []);

  // El valor guardado cambió desde afuera (por ejemplo "Marcar agotado"): el campo lo refleja.
  if (saved !== seenProp) {
    setSeenProp(saved);
    if (saved !== savedValue) {
      setSavedValue(saved);
      setText(format(saved));
    }
  }

  async function commit() {
    const parsed = kind === "price" ? parsePrice(text) : parseStock(text);
    if (parsed === null) {
      clearTimeout(timer.current);
      setStatus({ kind: "error", message: kind === "price" ? PRICE_ERROR : STOCK_ERROR });
      return;
    }

    setText(format(parsed));
    if (parsed === savedValue || parsed === pending.current) {
      if (status.kind === "error") setStatus({ kind: "idle" });
      return;
    }

    pending.current = parsed;
    clearTimeout(timer.current);
    setStatus({ kind: "saving" });
    let result: Awaited<ReturnType<NumberFieldProps["onSave"]>>;
    try {
      result = await onSave(String(parsed));
    } catch {
      result = { error: GENERIC_ERROR };
    }
    pending.current = null;

    if ("error" in result) {
      setStatus({ kind: "error", message: result.error });
      return;
    }
    setSavedValue(parsed);
    setStatus({ kind: "saved" });
    timer.current = setTimeout(() => setStatus({ kind: "idle" }), SAVED_VISIBLE_MS);
  }

  const hasError = status.kind === "error";

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        {kind === "price" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted"
          >
            ₲
          </span>
        ) : null}
        <input
          id={id}
          type="text"
          inputMode="numeric"
          enterKeyHint="done"
          autoComplete="off"
          value={text}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={hasError ? errorId : undefined}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commit();
            } else if (event.key === "Escape") {
              setText(format(savedValue));
              setStatus({ kind: "idle" });
            }
          }}
          className={`min-h-11 w-full rounded-lg border bg-bg px-3 text-base tabular-nums text-fg ${focusRing} ${
            kind === "price" ? "pl-8" : ""
          } ${hasError ? "border-danger" : "border-line"}`}
        />
      </div>
      <p role="status" className="min-h-5 text-sm text-muted">
        {status.kind === "saving" ? "Guardando…" : null}
        {status.kind === "saved" ? (
          <span className="inline-flex items-center gap-1 text-ok">
            <Check size={14} aria-hidden="true" />
            Guardado
          </span>
        ) : null}
      </p>
      {hasError ? (
        <p id={errorId} role="alert" className="-mt-1 flex items-start gap-1.5 text-sm font-medium text-danger">
          <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          {status.message}
        </p>
      ) : null}
    </div>
  );
}

function VariantFields({ variant, productName }: { variant: VariantDTO; productName: string }) {
  const baseId = useId();
  return (
    <div
      role="group"
      aria-label={`${productName}, ${variant.label}`}
      className="border-t border-line pt-3 first:border-t-0 first:pt-0"
    >
      <p className="mb-2 font-medium">{variant.label}</p>
      <div className="grid max-w-md grid-cols-2 gap-3">
        <InlineNumberField
          id={`${baseId}-price`}
          label="Precio"
          kind="price"
          saved={variant.price}
          onSave={(price) => updateVariant(variant.id, { price })}
        />
        <InlineNumberField
          id={`${baseId}-stock`}
          label="Stock"
          kind="stock"
          saved={variant.stock}
          onSave={(stock) => updateVariant(variant.id, { stock })}
        />
      </div>
    </div>
  );
}

function Switch({
  label,
  checked,
  pending,
  onToggle,
}: {
  label: string;
  checked: boolean;
  /** Mientras guarda no se acepta otro clic, pero el foco se queda en el interruptor. */
  pending?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={pending || undefined}
      onClick={() => {
        if (!pending) onToggle();
      }}
      className={`inline-flex min-h-11 items-center gap-3 rounded-lg pr-2 text-base aria-disabled:opacity-60 ${focusRing}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-6 w-11 shrink-0 items-center rounded-full border-2 px-0.5 transition-colors duration-200 ${
          checked ? "border-fg bg-fg" : "border-muted bg-surface"
        }`}
      >
        <span
          className={`size-4 rounded-full transition-transform duration-200 ${
            checked ? "translate-x-5 bg-bg" : "translate-x-0 bg-muted"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

export function ProductRow({ product }: { product: ProductDTO }) {
  const [pendingFeatured, startFeatured] = useTransition();
  const [pendingActive, startActive] = useTransition();
  const [pendingSoldOut, startSoldOut] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const refocusSoldOut = useRef(false);
  const soldOutButtonId = `${product.id}-sold-out`;
  const [error, setError] = useState<string | null>(null);
  const [flags, setFlags] = useOptimistic(
    { featured: product.featured, active: product.active },
    (current, patch: Partial<{ featured: boolean; active: boolean }>) => ({ ...current, ...patch }),
  );
  const soldOut = isSoldOut(product.variants);
  const categoryLabel = CATEGORIES.find((category) => category.value === product.category)?.label;

  function toggle(flag: "featured" | "active") {
    setError(null);
    const value = !flags[flag];
    (flag === "featured" ? startFeatured : startActive)(async () => {
      setFlags({ [flag]: value });
      try {
        await toggleProductFlag(product.id, flag, value);
      } catch {
        setError(GENERIC_ERROR);
      }
    });
  }

  // Al cerrar la confirmación el botón vuelve a aparecer: el foco vuelve con él.
  useEffect(() => {
    if (refocusSoldOut.current && !confirming) {
      refocusSoldOut.current = false;
      document.getElementById(soldOutButtonId)?.focus();
    }
  });

  function closeConfirm() {
    refocusSoldOut.current = true;
    setConfirming(false);
  }

  function soldOutAll() {
    setError(null);
    closeConfirm();
    startSoldOut(async () => {
      try {
        const result = await markSoldOut(product.id);
        if ("error" in result) setError(result.error);
      } catch {
        setError(GENERIC_ERROR);
      }
    });
  }

  return (
    <li className="grid gap-4 border border-line bg-surface p-4 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-6">
      <div className="flex gap-3 md:flex-col">
        <div className="relative size-16 shrink-0 overflow-hidden bg-bg md:size-24">
          <SafeImage
            src={product.images[0]}
            alt=""
            fill
            sizes="96px"
            className={`object-cover ${flags.active ? "" : "opacity-50"}`}
          />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug">
            <Link
              href={`/admin/productos/${product.id}`}
              className={`underline underline-offset-4 hover:no-underline ${focusRing}`}
            >
              {product.name}
            </Link>
          </h2>
          <p className="text-sm text-muted">
            {categoryLabel}
            {flags.active ? "" : " · Oculto en la tienda"}
            {soldOut ? " · Agotado" : ""}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-3">
          {product.variants.map((variant) => (
            <VariantFields key={variant.id} variant={variant} productName={product.name} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line pt-3">
          <Switch
            label="Destacado"
            checked={flags.featured}
            pending={pendingFeatured}
            onToggle={() => toggle("featured")}
          />
          <Switch
            label="Activo"
            checked={flags.active}
            pending={pendingActive}
            onToggle={() => toggle("active")}
          />
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {confirming ? (
              <>
                <span className="text-sm">¿Poner todo el stock en 0?</span>
                <Button size="sm" onClick={soldOutAll} autoFocus>
                  Sí, marcar agotado
                </Button>
                <Button size="sm" variant="secondary" onClick={closeConfirm}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                id={soldOutButtonId}
                size="sm"
                variant="secondary"
                // aria-disabled (no disabled): sigue enfocable y el foco no se pierde al agotarse.
                aria-disabled={soldOut || pendingSoldOut || undefined}
                onClick={() => {
                  if (!soldOut && !pendingSoldOut) setConfirming(true);
                }}
                className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent aria-disabled:hover:text-fg"
              >
                {pendingSoldOut ? "Guardando…" : "Marcar agotado"}
              </Button>
            )}
          </div>
        </div>

        {error ? (
          <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-danger">
            <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </li>
  );
}
