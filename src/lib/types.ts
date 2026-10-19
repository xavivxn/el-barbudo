export type Category = "perfume" | "barba" | "cabello";

export const CATEGORIES: { value: Category; label: string; slug: string }[] = [
  { value: "perfume", label: "Perfumes", slug: "perfumes" },
  { value: "barba", label: "Barba", slug: "barba" },
  { value: "cabello", label: "Cabello", slug: "cabello" },
];

export type Notes = { top: string; heart: string; base: string };

export type VariantDTO = {
  id: string;
  label: string;
  price: number;
  stock: number;
};

export type ProductDTO = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  category: Category;
  description: string;
  notes: Notes | null;
  benefits: string[];
  tags: string[];
  images: string[];
  featured: boolean;
  active: boolean;
  variants: VariantDTO[];
};

export type ServiceDTO = {
  id: string;
  name: string;
  description: string;
  price: number;
  order: number;
};

/**
 * Estado actual de una variante para refrescar el carrito. `available` = la variante existe y su
 * producto está activo. `name`, `slug`, `image` y `variantLabel` se copian tal cual al ítem
 * (`variantLabel` es `null` si el producto tiene una sola variante, como al agregarlo).
 */
export type VariantSnapshot = {
  id: string;
  price: number;
  stock: number;
  available: boolean;
  name: string;
  slug: string;
  image: string | null;
  variantLabel: string | null;
};
