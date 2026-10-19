"use client";

import { CircleAlert } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { login, type LoginState } from "@/app/admin/login/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cada respuesta con error es un objeto nuevo: el foco vuelve al campo en cada intento fallido.
  useEffect(() => {
    if (state.error) inputRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-base font-medium">
          Contraseña
        </label>
        <input
          ref={inputRef}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "password-error" : undefined}
          className={`min-h-12 w-full rounded-lg border bg-surface px-4 text-base text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            state.error ? "border-danger" : "border-line"
          }`}
        />
        {state.error ? (
          <p
            id="password-error"
            role="alert"
            className="flex items-center gap-2 text-sm font-medium text-danger"
          >
            <CircleAlert size={16} aria-hidden="true" className="shrink-0" />
            {state.error}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        aria-disabled={pending}
        onClick={(event) => {
          // Mientras envía no se aceptan más envíos.
          if (pending) event.preventDefault();
        }}
        className={pending ? "opacity-70" : ""}
      >
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
