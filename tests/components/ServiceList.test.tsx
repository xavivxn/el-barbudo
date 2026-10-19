import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceList } from "@/components/admin/ServiceList";
import type { ServiceDTO } from "@/lib/types";

const actions = vi.hoisted(() => ({ saveService: vi.fn(), deleteService: vi.fn(), moveService: vi.fn() }));
vi.mock("@/app/admin/service-actions", () => actions);

// jsdom no implementa showModal/close: lo mínimo para que `open` y el evento `close` existan, y como
// el navegador, showModal() lleva el foco al primer control del diálogo.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
    this.querySelector("button")?.focus();
  };
  HTMLDialogElement.prototype.close = function close() {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  vi.resetAllMocks();
  actions.deleteService.mockResolvedValue(undefined);
  actions.moveService.mockResolvedValue(undefined);
});

afterEach(cleanup);

const services: ServiceDTO[] = [
  { id: "s1", name: "Corte clásico", description: "Tijera y máquina.", price: 80000, order: 0 },
  { id: "s2", name: "Corte + barba", description: "Con toalla caliente.", price: 120000, order: 1 },
  { id: "s3", name: "Afeitado", description: "", price: 50000, order: 2 },
];

const dialog = () => document.querySelector("dialog") as HTMLDialogElement;

describe("confirmación de borrado", () => {
  it("Eliminar abre el diálogo con el nombre y los dos botones del mismo peso", async () => {
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    await user.click(screen.getByRole("button", { name: "Eliminar Corte + barba" }));

    expect(dialog()).toHaveAttribute("open");
    expect(within(dialog()).getByText("¿Eliminar Corte + barba? Esta acción no se puede deshacer.")).toBeInTheDocument();
    const confirm = within(dialog()).getByRole("button", { name: "Eliminar" });
    const cancel = within(dialog()).getByRole("button", { name: "Cancelar" });
    expect(confirm.className).toBe(cancel.className);
    // Lo primero enfocado es Cancelar: Enter sin querer no borra nada.
    expect(cancel).toHaveFocus();
    expect(actions.deleteService).not.toHaveBeenCalled();
  });

  it("Cancelar cierra y devuelve el foco al Eliminar de esa fila", async () => {
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    const trigger = screen.getByRole("button", { name: "Eliminar Corte + barba" });
    await user.click(trigger);
    await user.click(within(dialog()).getByRole("button", { name: "Cancelar" }));

    expect(dialog()).not.toHaveAttribute("open");
    expect(trigger).toHaveFocus();
    expect(actions.deleteService).not.toHaveBeenCalled();
  });

  it("Esc (el navegador cierra el <dialog>) devuelve el foco al mismo botón", async () => {
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    const trigger = screen.getByRole("button", { name: "Eliminar Afeitado" });
    await user.click(trigger);
    // Esc hace que el navegador cierre el <dialog> y dispare `close`.
    dialog().removeAttribute("open");
    fireEvent(dialog(), new Event("close"));

    expect(trigger).toHaveFocus();
    expect(actions.deleteService).not.toHaveBeenCalled();
  });

  it("confirmar borra por id y lleva el foco al título de la lista", async () => {
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    await user.click(screen.getByRole("button", { name: "Eliminar Corte + barba" }));
    await user.click(within(dialog()).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(actions.deleteService).toHaveBeenCalledWith("s2"));
    expect(dialog()).not.toHaveAttribute("open");
    expect(screen.getByRole("heading", { level: 1, name: "Servicios" })).toHaveFocus();
  });
});

describe("orden", () => {
  it("Subir y Bajar llevan el nombre y quedan aria-disabled en los extremos", () => {
    render(<ServiceList services={services} />);
    expect(screen.getByRole("button", { name: "Subir Corte clásico" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Bajar Afeitado" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Subir Corte + barba" })).not.toHaveAttribute("aria-disabled");
    expect(screen.getByRole("button", { name: "Bajar Corte clásico" })).not.toHaveAttribute("aria-disabled");
  });

  it("en el extremo no llama a la action y el botón sigue enfocable", async () => {
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    const up = screen.getByRole("button", { name: "Subir Corte clásico" });
    await user.click(up);
    expect(actions.moveService).not.toHaveBeenCalled();
    expect(up).not.toBeDisabled();
  });

  it("Subir llama a moveService con id y dirección y anuncia la nueva posición", async () => {
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    await user.click(screen.getByRole("button", { name: "Subir Corte + barba" }));
    await waitFor(() => expect(actions.moveService).toHaveBeenCalledWith("s2", "up"));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Corte + barba quedó en la posición 1 de 3."),
    );
  });
});

describe("región de estado", () => {
  async function saveFirstPrice(user: ReturnType<typeof userEvent.setup>, value: string) {
    await user.click(screen.getByRole("button", { name: "Editar Corte clásico" }));
    const price = screen.getByLabelText("Precio");
    await user.clear(price);
    await user.type(price, value);
    await user.click(screen.getByRole("button", { name: "Guardar servicio" }));
    await waitFor(() => expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument());
  }

  it("dos guardados seguidos anuncian los dos, con la región vacía entre uno y otro", async () => {
    actions.saveService.mockResolvedValue({ saved: true });
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    const status = screen.getByRole("status");
    const seen: string[] = [];
    new MutationObserver(() => seen.push(status.textContent ?? "")).observe(status, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    await saveFirstPrice(user, "90000");
    await waitFor(() => expect(status).toHaveTextContent("Servicio guardado"));
    await saveFirstPrice(user, "95000");
    await waitFor(() => expect(status).toHaveTextContent("Servicio guardado"));

    // Servicio guardado, (vacío), Servicio guardado: el segundo no se pierde por ser idéntico.
    expect(seen.filter((text) => text === "Servicio guardado")).toHaveLength(2);
    expect(seen).toContain("");
    expect(seen.indexOf("")).toBeGreaterThan(seen.indexOf("Servicio guardado"));
  });

  it("mover después de guardar reemplaza el texto", async () => {
    actions.saveService.mockResolvedValue({ saved: true });
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    await saveFirstPrice(user, "90000");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Servicio guardado"));

    await user.click(screen.getByRole("button", { name: "Bajar Corte clásico" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Corte clásico quedó en la posición 2 de 3."),
    );
    expect(screen.getByRole("status")).not.toHaveTextContent("Servicio guardado");
  });

  it("borrar escribe Servicio eliminado", async () => {
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    await user.click(screen.getByRole("button", { name: "Eliminar Afeitado" }));
    await user.click(within(dialog()).getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Servicio eliminado"));
  });

  const failure = { errors: { price: "Ingresá un precio en guaraníes, sin decimales." } };

  async function failSecondSave(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Editar Corte clásico" }));
    await user.click(screen.getByRole("button", { name: "Guardar servicio" }));
    await screen.findByRole("alert");
  }

  it("un guardado fallido borra el aviso anterior", async () => {
    actions.saveService.mockResolvedValueOnce({ saved: true }).mockResolvedValueOnce(failure);
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    await saveFirstPrice(user, "90000");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Servicio guardado"));

    await failSecondSave(user);
    // `onFailed` corre en un efecto posterior al render del error: se espera, no se asume.
    await waitFor(() => expect(screen.getByRole("status")).toBeEmptyDOMElement());
  });

  it("un guardado fallido cancela el aviso que todavía estaba pendiente", async () => {
    // Los temporizadores de 50 ms del aviso se retienen (no corren solos) y solo se ejecutan, al final,
    // los que nadie canceló: es lo que haría el navegador pasado ese tiempo.
    const realSetTimeout = globalThis.setTimeout;
    const realClearTimeout = globalThis.clearTimeout;
    const held = new Map<unknown, () => void>();
    let nextId = 0;
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((cb: () => void, ms?: number, ...rest: unknown[]) => {
      if (ms !== 50) return realSetTimeout(cb, ms, ...rest);
      const id = `held-${nextId++}`;
      held.set(id, cb);
      return id as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    vi.spyOn(globalThis, "clearTimeout").mockImplementation(((id?: unknown) => {
      if (typeof id === "string") held.delete(id);
      else realClearTimeout(id as ReturnType<typeof setTimeout>);
    }) as typeof clearTimeout);

    try {
      actions.saveService.mockResolvedValueOnce({ saved: true }).mockResolvedValueOnce(failure);
      const user = userEvent.setup({ delay: null });
      render(<ServiceList services={services} />);
      await saveFirstPrice(user, "90000");
      expect(held.size).toBe(1); // el aviso "Servicio guardado" está pendiente

      await failSecondSave(user);
      await waitFor(() => expect(held.size).toBe(0)); // el fallo lo canceló

      await act(async () => {
        for (const cb of held.values()) cb();
      });
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe("edición en línea", () => {
  it("Editar expande el formulario con los datos y marca aria-expanded", async () => {
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    const trigger = screen.getByRole("button", { name: "Editar Corte + barba" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Nombre")).toHaveValue("Corte + barba");
    expect(screen.getByLabelText("Precio")).toHaveValue("120.000");
    expect(screen.getByLabelText("Nombre")).toHaveFocus();
  });

  it("Cancelar cierra el formulario y devuelve el foco a Editar", async () => {
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    const trigger = screen.getByRole("button", { name: "Editar Corte + barba" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("guardar cierra el formulario, avisa y devuelve el foco", async () => {
    actions.saveService.mockResolvedValue({ saved: true });
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    const trigger = screen.getByRole("button", { name: "Editar Corte + barba" });
    await user.click(trigger);
    const price = screen.getByLabelText("Precio");
    await user.clear(price);
    await user.type(price, "130000");
    await user.click(screen.getByRole("button", { name: "Guardar servicio" }));

    await waitFor(() => expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument());
    const sent = actions.saveService.mock.calls[0][1] as FormData;
    expect(sent.get("id")).toBe("s2");
    expect(sent.get("price")).toBe("130000");
    expect(await screen.findByText("Servicio guardado")).toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("los errores aparecen junto al campo y en el resumen solo tras enviar", async () => {
    actions.saveService.mockResolvedValue({ errors: { price: "Ingresá un precio en guaraníes, sin decimales." } });
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    await user.click(screen.getByRole("button", { name: "Editar Corte + barba" }));
    const price = screen.getByLabelText("Precio");
    await user.clear(price);
    await user.type(price, "abc");
    // Al salir del campo: error junto al campo, sin resumen.
    await user.tab();
    expect(price).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar servicio" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Hay 1 campo para revisar");
    expect(price).toHaveAccessibleDescription(/Ingresá un precio en guaraníes/);
  });

  it("Nuevo servicio abre el formulario vacío arriba, sin id", async () => {
    const user = userEvent.setup();
    render(<ServiceList services={services} />);
    await user.click(screen.getByRole("button", { name: "Nuevo servicio" }));
    expect(screen.getByLabelText("Nombre")).toHaveValue("");
    expect(document.querySelector('input[name="id"]')).toBeNull();
    expect(document.querySelector('input[name="order"]')).toBeNull();
  });
});
