import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { whatsappUrl } from "@/lib/whatsapp";
import { site } from "@/site";

const linkClass =
  "underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const headingClass = "mb-4 text-sm uppercase tracking-[0.16em] text-muted";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-3 md:px-8">
        <div className="flex flex-col items-start gap-6">
          <Logo variant="full" />
          <p className="max-w-xs text-muted">{site.tagline}</p>
          <Button
            variant="secondary"
            size="sm"
            href={whatsappUrl("Hola El Barbudo")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon />
            Escribinos por WhatsApp
          </Button>
        </div>

        <div>
          <h2 className={headingClass}>Visitanos</h2>
          <address className="not-italic">
            <a
              href={site.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex min-h-11 items-center ${linkClass}`}
            >
              {site.address}
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </address>
          <a
            href={site.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-11 items-center ${linkClass}`}
          >
            Instagram
            <span className="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
        </div>

        <div>
          <h2 className={headingClass}>Horarios</h2>
          <dl className="space-y-2">
            {site.hours.map((row) => (
              <div key={row.days} className="flex justify-between gap-6">
                <dt>{row.days}</dt>
                <dd className="text-muted">{row.time}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted md:px-8">
          © {new Date().getFullYear()} {site.name}
        </p>
      </div>
    </footer>
  );
}
