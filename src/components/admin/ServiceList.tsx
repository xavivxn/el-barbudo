"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteService, moveService } from "@/app/admin/service-actions";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { Button } from "@/components/ui/Button";
import { formatPYG } from "@/lib/money";
import type { ServiceDTO } from "@/lib/types";

const NEW = "new";
const SAVED_URL = "/admin/servicios?guardado=servicio";

const disabledLook =
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent aria-disabled:hover:text-fg";

/** Lista del admin de servicios: orden, edición en línea y borrado con confirmación. */
export function ServiceList({ services }: { services: ServiceDTO[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  /** Id del servicio que se edita, `NEW` para el formulario vacío, `null` si no hay ninguno abierto. */
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ServiceDTO | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const headingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const deleteTrigger = useRef<HTMLElement | null>(null);
  const closeReason = useRef<"cancel" | "deleted">("cancel");

  // Foco que se mueve cuando el formulario ya se cerró (el elemento recién existe tras el render).
  const focusAfterRender = useRef<string | null>(null);
  useEffect(() => {
    if (focusAfterRender.current) {
      document.getElementById(focusAfterRender.current)?.focus();
      focusAfterRender.current = null;
    }
  });

  // Tras mover, la fila cambia de lugar: el botón pulsado conserva el foco cuando llegan los datos nuevos.
  const focusAfterMove = useRef<string | null>(null);
  useEffect(() => {
    if (focusAfterMove.current) {
      document.getElementById(focusAfterMove.current)?.focus();
      focusAfterMove.current = null;
    }
  }, [services]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (deleting && dialog && !dialog.open) {
      dialog.showModal();
      // El foco empieza en lo que no destruye nada.
      dialog.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    }
  }, [deleting]);

  function triggerIdOf(id: string) {
    return id === NEW ? "service-new" : `service-edit-${id}`;
  }

  function closeForm(id: string) {
    focusAfterRender.current = triggerIdOf(id);
    setEditing(null);
  }

  function toggleEdit(id: string) {
    setEditing((current) => (current === id ? null : id));
  }

  function move(service: ServiceDTO, index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= services.length) return;
    focusAfterMove.current = `service-${direction}-${service.id}`;
    startTransition(async () => {
      await moveService(service.id, direction);
      setAnnouncement(`${service.name} quedó en la posición ${target + 1} de ${services.length}.`);
    });
  }

  function askDelete(service: ServiceDTO, trigger: HTMLElement) {
    deleteTrigger.current = trigger;
    closeReason.current = "cancel";
    setDeleting(service);
  }

  function confirmDelete() {
    if (!deleting) return;
    const { id } = deleting;
    closeReason.current = "deleted";
    dialogRef.current?.close();
    startTransition(async () => {
      await deleteService(id);
    });
  }

  /** Se dispara con Cancelar, con Esc y tras confirmar: el foco vuelve según cómo se cerró. */
  function handleClosed() {
    const trigger = deleteTrigger.current;
    const reason = closeReason.current;
    deleteTrigger.current = null;
    closeReason.current = "cancel";
    setDeleting(null);
    if (reason === "deleted") headingRef.current?.focus();
    else if (trigger?.isConnected) trigger.focus();
  }

  const form = (service: ServiceDTO | undefined, id: string) => (
    <div id={`service-form-${id}`} className="border-t border-line pt-5">
      <ServiceForm
        service={service}
        nextOrder={services.length}
        formId={`service-form-${id}`}
        onSaved={() => {
          closeForm(id);
          router.replace(SAVED_URL, { scroll: false });
        }}
        onCancel={() => closeForm(id)}
      />
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">
          Servicios
        </h1>
        <Button
          id="service-new"
          aria-expanded={editing === NEW}
          aria-controls={`service-form-${NEW}`}
          onClick={() => toggleEdit(NEW)}
        >
          Nuevo servicio
        </Button>
      </div>

      <div role="status" className="sr-only">
        {announcement}
      </div>

      {editing === NEW ? <div className="mt-6 border border-line bg-surface p-4">{form(undefined, NEW)}</div> : null}

      <p className="mt-4 text-sm text-muted">
        {services.length === 1 ? "1 servicio" : `${services.length} servicios`}
      </p>

      {services.length === 0 ? (
        <p className="mt-6">Todavía no cargaste servicios. Tocá &ldquo;Nuevo servicio&rdquo; para crear el primero.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {services.map((service, index) => {
            const first = index === 0;
            const last = index === services.length - 1;
            const open = editing === service.id;
            return (
              <li key={service.id} className="flex flex-col gap-4 border border-line bg-surface p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <h2 className="min-w-0 text-lg font-semibold">{service.name}</h2>
                  <p className="font-medium tabular-nums">{formatPYG(service.price)}</p>
                </div>
                {service.description ? <p className="text-muted">{service.description}</p> : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    id={`service-up-${service.id}`}
                    size="sm"
                    variant="secondary"
                    aria-label={`Subir ${service.name}`}
                    // aria-disabled (no disabled): sigue enfocable y el foco no se pierde en el extremo.
                    aria-disabled={first || undefined}
                    onClick={() => move(service, index, "up")}
                    className={disabledLook}
                  >
                    Subir
                  </Button>
                  <Button
                    id={`service-down-${service.id}`}
                    size="sm"
                    variant="secondary"
                    aria-label={`Bajar ${service.name}`}
                    aria-disabled={last || undefined}
                    onClick={() => move(service, index, "down")}
                    className={disabledLook}
                  >
                    Bajar
                  </Button>
                  <Button
                    id={triggerIdOf(service.id)}
                    size="sm"
                    variant="secondary"
                    aria-label={`Editar ${service.name}`}
                    aria-expanded={open}
                    aria-controls={`service-form-${service.id}`}
                    onClick={() => toggleEdit(service.id)}
                  >
                    Editar
                  </Button>
                  <Button
                    id={`service-delete-${service.id}`}
                    size="sm"
                    variant="secondary"
                    aria-label={`Eliminar ${service.name}`}
                    onClick={(event) => askDelete(service, event.currentTarget)}
                  >
                    Eliminar
                  </Button>
                </div>

                {open ? form(service, service.id) : null}
              </li>
            );
          })}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="service-delete-title"
        onClose={handleClosed}
        className="m-auto w-[min(92vw,26rem)] rounded-xl border border-line bg-surface p-6 text-fg backdrop:bg-black/50"
      >
        <p id="service-delete-title" className="text-lg font-semibold">
          {deleting ? `¿Eliminar ${deleting.name}? Esta acción no se puede deshacer.` : null}
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={confirmDelete}>
            Eliminar
          </Button>
          <Button data-initial-focus variant="secondary" className="flex-1" onClick={() => dialogRef.current?.close()}>
            Cancelar
          </Button>
        </div>
      </dialog>
    </>
  );
}
