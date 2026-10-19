import type { CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SafeImage } from "@/components/ui/SafeImage";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { whatsappUrl } from "@/lib/whatsapp";
import { site } from "@/site";

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=2400&q=75";

/** Sobre la foto oscura el texto es claro en ambos modos: se invierten los tokens solo acá. */
const onPhotoTokens = {
  "--fg": "#F2EFE9",
  "--bg": "#141414",
  "--accent": "#C9A66B",
} as CSSProperties;

export function Hero() {
  return (
    <section
      aria-labelledby="hero-titulo"
      style={onPhotoTokens}
      className="relative isolate flex h-svh min-h-[34rem] items-end overflow-hidden bg-[#141414] text-fg md:h-[85vh]"
    >
      <SafeImage
        src={HERO_IMAGE}
        alt=""
        fill
        preload
        sizes="100vw"
        className="-z-20 object-cover object-[30%_center]"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/45" />

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-8 md:pb-24">
        <Reveal>
          <p className="text-xs font-medium tracking-[0.16em]">PERFUMERÍA · BARBA · CABELLO</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1
            id="hero-titulo"
            className="mt-5 max-w-3xl font-serif text-[44px] font-medium leading-[1.05] md:text-[80px]"
          >
            Lo esencial, bien hecho.
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-5 max-w-md text-lg">
            {site.tagline}. Cortes a tijera, barba a navaja y fragancias elegidas una por una.
          </p>
        </Reveal>
        <Reveal delay={0.24} className="mt-10 flex flex-wrap gap-3">
          <Button href="/productos">Ver catálogo</Button>
          <Button
            variant="secondary"
            href={whatsappUrl("Hola El Barbudo")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon />
            Escribinos
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
