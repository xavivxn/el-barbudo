import { Droplets, Scissors, SprayCan, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { CATEGORIES, type Category } from "@/lib/types";

const DETAILS: Record<Category, { icon: LucideIcon; hint: string }> = {
  perfume: { icon: SprayCan, hint: "Fragancias para todos los días y para la noche" },
  barba: { icon: Droplets, hint: "Aceites, bálsamos y shampoo" },
  cabello: { icon: Scissors, hint: "Pomadas y ceras para peinar" },
};

export function CategoryLinks() {
  return (
    <nav aria-label="Categorías" className="mx-auto max-w-6xl px-4 md:px-8">
      <ul className="grid grid-cols-3 border-y border-line">
        {CATEGORIES.map((category) => {
          const { icon: Icon, hint } = DETAILS[category.value];
          return (
            <li key={category.slug} className="border-line not-first:border-l">
              <Link
                href={`/productos?categoria=${category.slug}`}
                className="group flex h-full flex-col items-start gap-4 px-3 py-8 transition-colors duration-200 hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent md:gap-6 md:px-8 md:py-12"
              >
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.25}
                  className="h-8 w-8 text-accent md:h-10 md:w-10"
                />
                <span className="font-serif text-2xl font-medium leading-none md:text-4xl">
                  {category.label}
                </span>
                <span className="hidden text-muted md:block">{hint}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
