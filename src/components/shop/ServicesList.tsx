import { Button } from "@/components/ui/Button";
import { formatPYG } from "@/lib/money";
import type { ServiceDTO } from "@/lib/types";
import { buildBookingMessage, whatsappUrl } from "@/lib/whatsapp";

export function ServicesList({ services }: { services: ServiceDTO[] }) {
  return (
    <section
      id="servicios"
      aria-labelledby="servicios-titulo"
      className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28"
    >
      <div className="grid gap-4 md:grid-cols-12 md:gap-16">
        <div className="md:col-span-4">
          <h2 id="servicios-titulo" className="font-serif text-4xl font-medium leading-tight md:text-5xl">
            Servicios
          </h2>
          <p className="mt-4 max-w-sm text-muted">
            Elegí el servicio y te confirmamos el horario por WhatsApp.
          </p>
        </div>

        {services.length === 0 ? (
          <p className="text-muted md:col-span-8">
            Escribinos por WhatsApp para consultar los servicios disponibles.
          </p>
        ) : (
          <ul className="border-b border-line md:col-span-8">
            {services.map((service) => (
              <li
                key={service.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 border-t border-line py-6"
              >
                <h3 className="font-serif text-2xl font-medium leading-tight">{service.name}</h3>
                <p className="text-right tabular-nums">{formatPYG(service.price)}</p>
                <p className="text-muted">{service.description}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  href={whatsappUrl(buildBookingMessage(service.name))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="justify-self-end"
                >
                  Reservar
                  <span className="sr-only"> {service.name} por WhatsApp</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
