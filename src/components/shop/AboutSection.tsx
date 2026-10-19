import { SafeImage } from "@/components/ui/SafeImage";
import { site } from "@/site";

export function AboutSection() {
  const { title, body, image } = site.about;
  return (
    <section aria-labelledby="sobre-titulo" className="bg-surface">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-12 md:gap-16 md:px-8 md:py-28">
        <div className="relative aspect-4/3 overflow-hidden md:col-span-6 md:aspect-4/5 lg:col-span-7">
          <SafeImage
            src={image}
            alt="Sillón de barbero de cuero en el local"
            fill
            sizes="(min-width: 768px) 55vw, 100vw"
            className="object-cover object-[center_35%]"
          />
        </div>
        <div className="md:col-span-6 lg:col-span-5">
          <h2 id="sobre-titulo" className="font-serif text-4xl font-medium leading-tight md:text-5xl">
            {title}
          </h2>
          <div className="mt-6 max-w-prose space-y-4 text-lg leading-relaxed">
            {body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
