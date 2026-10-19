// ATENCION: este seed BORRA todos los productos, variantes y servicios antes de
// recrearlos. Solo para desarrollo o demo; nunca correrlo contra datos reales.
import "dotenv/config";
import { createPrismaClient } from "../src/lib/prisma-client";

const prisma = createPrismaClient();

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&q=75`;

type SeedProduct = {
  slug: string;
  name: string;
  subtitle: string;
  category: "perfume" | "barba" | "cabello";
  description: string;
  notes?: { top: string; heart: string; base: string };
  benefits?: string[];
  tags: string[];
  images: string[];
  featured?: boolean;
  variants: { label: string; price: number; stock: number }[];
};

const products: SeedProduct[] = [
  {
    slug: "bleu-de-chanel",
    name: "Bleu de Chanel",
    subtitle: "Eau de parfum",
    category: "perfume",
    description:
      "Un aromático amaderado para el hombre que no sigue reglas. Abre con cítricos frescos, se asienta en especias y madera, y deja una estela limpia que dura todo el día.",
    notes: {
      top: "Pomelo, limón, menta, pimienta rosa",
      heart: "Jengibre, nuez moscada, jazmín",
      base: "Incienso, cedro, sándalo, pachulí",
    },
    tags: ["amaderado", "fresco", "día"],
    images: [img("1523293182086-7651a899d37f")],
    featured: true,
    variants: [
      { label: "50 ml", price: 750000, stock: 5 },
      { label: "100 ml", price: 1050000, stock: 3 },
    ],
  },
  {
    slug: "dior-sauvage",
    name: "Dior Sauvage",
    subtitle: "Eau de toilette",
    category: "perfume",
    description:
      "Fresco y magnético, inspirado en espacios abiertos. La bergamota de Calabria se funde con una base ambarada y amaderada de gran proyección.",
    notes: {
      top: "Bergamota de Calabria, pimienta",
      heart: "Pimienta de Sichuan, lavanda, geranio, vetiver",
      base: "Ambroxan, cedro, ládano",
    },
    tags: ["fresco", "especiado", "día", "intenso"],
    images: [img("1698877779289-d546e6376001")],
    featured: true,
    variants: [
      { label: "60 ml", price: 680000, stock: 4 },
      { label: "100 ml", price: 920000, stock: 0 },
    ],
  },
  {
    slug: "creed-aventus",
    name: "Creed Aventus",
    subtitle: "Eau de parfum",
    category: "perfume",
    description:
      "El perfume de nicho más comentado de la última década. Frutal y ahumado al inicio, con una base de almizcle y musgo que se vuelve adictiva. Para ocasiones donde importa dejar huella.",
    notes: {
      top: "Piña, bergamota, manzana, grosella negra",
      heart: "Abedul, pachulí, jazmín, rosa",
      base: "Almizcle, musgo de roble, ámbar gris, vainilla",
    },
    tags: ["intenso", "noche", "amaderado"],
    images: [img("1672848812581-f6e71ffa6839")],
    featured: true,
    variants: [
      { label: "50 ml", price: 1450000, stock: 2 },
      { label: "100 ml", price: 1900000, stock: 2 },
    ],
  },
  {
    slug: "tom-ford-oud-wood",
    name: "Tom Ford Oud Wood",
    subtitle: "Eau de parfum",
    category: "perfume",
    description:
      "Oud oscuro, cálido y refinado. Una fragancia de sala de whisky: madera preciosa, especias suaves y un fondo de vainilla seca.",
    notes: {
      top: "Palo de rosa, cardamomo, pimienta de Sichuan",
      heart: "Madera de oud, sándalo, vetiver",
      base: "Haba tonka, ámbar, vainilla",
    },
    tags: ["amaderado", "noche", "intenso"],
    images: [img("1553699357-fdefb876c402")],
    variants: [{ label: "50 ml", price: 1650000, stock: 0 }],
  },
  {
    slug: "ysl-y",
    name: "Yves Saint Laurent Y",
    subtitle: "Eau de parfum",
    category: "perfume",
    description:
      "Limpio, moderno y versátil. Manzana y jengibre sobre una base de maderas y haba tonka; de los que funcionan igual de bien en la oficina que en una salida.",
    notes: {
      top: "Manzana, jengibre, bergamota",
      heart: "Salvia, enebro, geranio",
      base: "Haba tonka, cedro, vetiver, incienso",
    },
    tags: ["fresco", "suave", "día"],
    images: [img("1674318881563-84ba1a53d9c4")],
    variants: [
      { label: "60 ml", price: 720000, stock: 6 },
      { label: "100 ml", price: 980000, stock: 4 },
    ],
  },
  {
    slug: "versace-eros",
    name: "Versace Eros",
    subtitle: "Eau de toilette",
    category: "perfume",
    description:
      "Fresco, dulce y seductor. Menta y manzana verde que abren paso a vainilla y maderas. Una fragancia de carácter joven para noches de verano.",
    notes: {
      top: "Menta, manzana verde, limón",
      heart: "Haba tonka, ambroxan, geranio",
      base: "Vainilla, vetiver, musgo de roble, cedro",
    },
    tags: ["fresco", "dulce", "noche"],
    images: [img("1587017539504-67cfbddac569")],
    variants: [
      { label: "50 ml", price: 480000, stock: 7 },
      { label: "100 ml", price: 650000, stock: 5 },
    ],
  },
  {
    slug: "acqua-di-gio-profumo",
    name: "Acqua di Giò Profumo",
    subtitle: "Eau de parfum",
    category: "perfume",
    description:
      "La versión más profunda de un clásico marino. Frescura de mar y bergamota sobre un fondo de incienso y pachulí, sobrio y elegante.",
    notes: {
      top: "Notas marinas, bergamota",
      heart: "Salvia, romero, geranio",
      base: "Incienso, pachulí",
    },
    tags: ["fresco", "suave", "día"],
    images: [img("1708979165880-dd0ff61fa748")],
    variants: [{ label: "75 ml", price: 790000, stock: 3 }],
  },
  {
    slug: "aceite-de-barba",
    name: "Aceite de barba",
    subtitle: "Aceite de barba · 30 ml",
    category: "barba",
    description:
      "Suaviza, hidrata y da brillo natural a la barba sin dejar sensación grasosa. Aroma sutil a cedro y cítricos. Se aplica unas gotas con la barba seca o apenas húmeda.",
    benefits: [
      "Aceite de argán: hidrata y suaviza",
      "Aceite de jojoba: equilibra la piel bajo la barba",
      "Vitamina E: protege y da brillo",
    ],
    tags: ["natural", "suave", "día"],
    images: [img("1608571424266-edeb9bbefdec")],
    featured: true,
    variants: [{ label: "30 ml", price: 85000, stock: 12 }],
  },
  {
    slug: "balsamo-de-barba",
    name: "Bálsamo de barba",
    subtitle: "Bálsamo de barba · 100 ml",
    category: "barba",
    description:
      "Da forma y control a barbas largas o rebeldes, con acabado natural y aroma amaderado. Nutre mientras peina.",
    benefits: [
      "Manteca de karité: nutre en profundidad",
      "Cera de abejas: fija y da forma",
      "Aceite de almendras: suaviza el vello",
    ],
    tags: ["natural", "amaderado"],
    images: [], // sin foto: no hay una sin marca ajena; el sitio muestra el placeholder
    variants: [{ label: "100 ml", price: 95000, stock: 8 }],
  },
  {
    slug: "shampoo-de-barba",
    name: "Shampoo de barba",
    subtitle: "Shampoo de barba · 200 ml",
    category: "barba",
    description:
      "Limpia a fondo sin resecar la piel ni el vello. Fórmula suave de uso diario que deja la barba fresca y lista para el aceite o el bálsamo.",
    benefits: [
      "Aloe vera: calma la piel",
      "Extracto de mentol: sensación fresca",
      "Sin sulfatos agresivos",
    ],
    tags: ["natural", "fresco", "suave"],
    images: [img("1517832606299-7ae9b720a186")],
    variants: [{ label: "200 ml", price: 65000, stock: 15 }],
  },
  {
    slug: "pomada-mate",
    name: "Pomada mate",
    subtitle: "Pomada de fijación media · 100 g",
    category: "cabello",
    description:
      "Fijación media y acabado mate para peinados con textura. Se aplica con facilidad, no deja residuos y se lava con agua.",
    benefits: [
      "Arcilla: textura y acabado mate",
      "Fijación media, reposicionable",
      "Se enjuaga con agua",
    ],
    tags: ["natural", "día"],
    images: [], // sin foto: no hay una sin marca ajena; el sitio muestra el placeholder
    variants: [{ label: "100 g", price: 90000, stock: 10 }],
  },
  {
    slug: "cera-moldeadora",
    name: "Cera moldeadora",
    subtitle: "Cera de fijación fuerte · 80 g",
    category: "cabello",
    description:
      "Fijación fuerte y brillo ligero para peinados definidos que aguantan todo el día. Aroma a vainilla y ámbar.",
    benefits: [
      "Cera de abejas: fijación fuerte",
      "Brillo ligero y flexible",
      "Aroma a vainilla y ámbar",
    ],
    tags: ["intenso", "dulce"],
    images: [], // sin foto: no hay una sin marca ajena; el sitio muestra el placeholder
    variants: [{ label: "80 g", price: 75000, stock: 9 }],
  },
];

const services = [
  {
    name: "Corte clásico",
    description: "Corte a tijera o máquina, lavado y peinado final.",
    price: 50000,
  },
  {
    name: "Corte + barba",
    description: "Corte completo y arreglo de barba con toalla caliente.",
    price: 80000,
  },
  {
    name: "Perfilado de barba",
    description: "Definición de contornos y recorte a medida.",
    price: 35000,
  },
  {
    name: "Afeitado con navaja",
    description: "Afeitado tradicional con toalla caliente y aceites.",
    price: 60000,
  },
  {
    name: "Corte infantil",
    description: "Corte para niños hasta 10 años, con paciencia incluida.",
    price: 40000,
  },
  {
    name: "Tratamiento capilar",
    description: "Limpieza profunda, hidratación y masaje de cuero cabelludo.",
    price: 70000,
  },
];

async function main() {
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.service.deleteMany();

  const base = Date.now();
  for (const [i, p] of products.entries()) {
    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        subtitle: p.subtitle,
        category: p.category,
        description: p.description,
        notes: p.notes ? JSON.stringify(p.notes) : null,
        benefits: JSON.stringify(p.benefits ?? []),
        tags: JSON.stringify(p.tags),
        images: JSON.stringify(p.images),
        featured: p.featured ?? false,
        active: true,
        // el primero de la lista es el más reciente
        createdAt: new Date(base - i * 1000),
        variants: { create: p.variants },
      },
    });
  }

  for (const [order, s] of services.entries()) {
    await prisma.service.create({ data: { ...s, order } });
  }

  console.log(`Seed listo: ${products.length} productos, ${services.length} servicios`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
