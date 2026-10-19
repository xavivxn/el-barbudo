# El Barbudo E-commerce MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tienda online de El Barbudo (perfumes, barba, cabello) con pedido por WhatsApp, modo claro/oscuro y un admin con contraseña para productos, stock, precios y servicios.

**Architecture:** Next.js App Router con Server Components que leen la base vía Prisma (SQLite en el MVP). La lógica de dominio (dinero, mensajes de WhatsApp, reglas de stock, relacionados) vive en funciones puras en `src/lib/` con tests en Vitest. El carrito es un store de Zustand persistido en `localStorage` que se reconcilia contra el stock real al abrirse. El admin usa Server Actions protegidas por una sesión `iron-session`.

**Tech Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 + `@prisma/adapter-better-sqlite3` · Motion (`motion/react`) · next-themes · iron-session 8+ · Zustand 5 · Zod 4 · Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-19-elbarbudo-ecommerce-design.md`

## Global Constraints

- Todo el texto de la UI en español; sin "por favor"; sin signos de exclamación en mensajes de sistema.
- Precios: enteros en guaraníes, mostrados como `₲ 285.000` (punto como separador de miles, sin decimales).
- Paleta exacta (CSS custom properties, claro / oscuro): fondo `#F7F5F0` / `#121212`; superficie `#FFFFFF` / `#1C1C1C`; texto `#141414` / `#F2EFE9`; texto secundario `#6B6762` / `#A39E95`; borde `#E6E2DA` / `#2E2C29`; acento bronce `#9A7B4F` / `#C9A66B`; en stock `#3F6B52` / `#7FA68F`; WhatsApp `#25D366` (solo botón "Enviar pedido por WhatsApp").
- Bronce solo como fondo de botón con texto oscuro (`#141414`) encima, o en íconos grandes; nunca texto chico bronce sobre fondo claro.
- Tipografía: títulos y wordmark en Cormorant Garamond (500/600); resto en Inter. Body ≥ 16px, line-height 1.5.
- Tema por defecto = sistema (`prefers-color-scheme`); toggle sol/luna persiste la elección.
- Animaciones 150–300 ms (máximo 500 ms); todas desactivadas con `prefers-reduced-motion`.
- Targets táctiles ≥ 44 px en móvil; foco visible en todo control; contraste de texto ≥ 4.5:1.
- Evitar: gradientes morados, glassmorphism, tarjetas anidadas, emoji como íconos en la UI (el 👋 del mensaje de WhatsApp sí va), íconos decorativos en cada título.
- Íconos: `lucide-react`.
- Variables de entorno: `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET` (≥ 32 caracteres), `NEXT_PUBLIC_WHATSAPP_NUMBER` (ej. `595981123456`). Documentadas en `.env.example`.
- Toda Server Action del admin llama `requireAdmin()` como primera línea.
- Commits terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Stock cambió con ítems ya en el carrito** (el carrito vive en `localStorage` días). Al abrir el drawer, precios y stock se refrescan; cantidades se recortan al stock; ítems agotados, inactivos o borrados salen del carrito con un aviso que dice cuáles. → test en Task 4 (`reconcile`) y Task 9.
2. **Texto con caracteres especiales en el mensaje de WhatsApp** (`&`, `#`, `?`, tildes, salto de línea, emoji) llega intacto. → test en Task 2 (`whatsappUrl`).
3. **Número de WhatsApp con formato humano** (`+595 981 123-456`) o variable ausente: se limpian no-dígitos; si falta, se usa `site.whatsapp` de `site.ts`. → test en Task 2.
4. **Admin escribe precios como los lee** (`285.000`, `285000`, ` 285 000 `) o valores inválidos (`-5`, `12,5`, vacío): los primeros se aceptan como `285000`, los otros muestran error junto al campo y no guardan. → test en Task 2 (`parseGuaranies`) y Task 11.
5. **URL de producto inactivo o inexistente** abre la página 404 de la marca, no un error; una imagen que no carga muestra un placeholder neutro en vez de un hueco. → test en Task 3 (`getProductBySlug` filtra inactivos) y verificación en Task 8.

---

## File Structure

```
prisma/schema.prisma            modelos Product, Variant, Service
prisma/seed.ts                  datos de prueba
prisma.config.ts                config Prisma 7 (datasource + seed)
src/site.ts                     datos del local (nombre, dirección, horarios, IG, WhatsApp, "Sobre")
src/lib/money.ts                formatPYG, parseGuaranies
src/lib/whatsapp.ts             builders de mensajes y URL
src/lib/stock.ts                isSoldOut, clampQuantity, minPrice
src/lib/types.ts                Category, ProductDTO, VariantDTO, ServiceDTO, VariantSnapshot
src/lib/db.ts                   cliente Prisma singleton
src/lib/products.ts             lecturas de productos + toProductDTO + pickRelated
src/lib/services.ts             lecturas de servicios
src/lib/auth.ts                 sesión admin
src/stores/cart.ts              store Zustand del carrito
src/components/ui/*             Button, Chip, Reveal, ThemeToggle, Logo, SafeImage
src/components/shop/*           Header, Footer, Hero, CategoryLinks, ProductCard, ProductGrid,
                                CatalogFilters, ProductGallery, ProductPurchase, CartButton,
                                CartDrawer, AboutSection, ServicesList
src/components/admin/*          ProductForm, ProductRow, ServiceForm
src/app/(shop)/...              portada, catálogo, ficha, not-found
src/app/admin/...               login, panel, productos, servicios, actions.ts
tests/                          Vitest (espejo de src/)
```

---

### Task 1: Proyecto base, tokens de diseño y tema

**Files:**
- Create: proyecto con `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm` (en la carpeta existente; conservar `logo.jpg`, `docs/`, `.agents/`, `.claude/`, `skills-lock.json`)
- Create: `vitest.config.ts`, `tests/setup.ts`, `.env.example`, `.gitignore` (añadir `.superpowers/`, `*.db`, `.env`)
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Create: `src/components/ui/ThemeToggle.tsx`, `src/components/ui/Logo.tsx`, `src/site.ts`
- Move: `logo.jpg` → `public/logo.jpg`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces: clases Tailwind de tema `bg-bg`, `bg-surface`, `text-fg`, `text-muted`, `border-line`, `bg-accent`, `text-accent`, `text-ok`, `bg-whatsapp`; fuentes `font-serif` (Cormorant) y `font-sans` (Inter).
- Produces: `site: { name: string; tagline: string; address: string; mapsUrl: string; hours: {days: string; time: string}[]; instagram: string; whatsapp: string; about: {title: string; body: string[]; image: string} }` exportado desde `src/site.ts`.
- Produces: `<ThemeToggle />` (client), `<Logo variant="mark" | "full" className? />`.

- [ ] **Step 1:** `git init`, scaffold con el comando de arriba, instalar `next-themes lucide-react motion zustand zod iron-session` y dev `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`. Script `"test": "vitest run"`.
- [ ] **Step 2:** Escribir `tests/smoke.test.ts` con `expect(1 + 1).toBe(2)`; correr `npm test` → PASS (confirma que Vitest + alias `@/` funcionan).
- [ ] **Step 3:** En `globals.css`, definir la paleta de Global Constraints como variables en `:root` y en `.dark`, y exponerlas en `@theme inline` con los nombres de arriba. `@custom-variant dark (&:where(.dark, .dark *));`. Bloque `@media (prefers-reduced-motion: reduce)` que anula transiciones/animaciones.
- [ ] **Step 4:** `layout.tsx`: `next/font/google` para Cormorant Garamond (500, 600) e Inter; `<html lang="es" suppressHydrationWarning>`; `ThemeProvider` de next-themes con `attribute="class" defaultTheme="system" enableSystem`. Metadata: título "El Barbudo — Barbería y perfumería", descripción en español.
- [ ] **Step 5:** `ThemeToggle`: `<button aria-label="Cambiar a modo oscuro|claro">` con ícono `Moon`/`Sun`, 44×44; no renderiza ícono hasta montado (evita mismatch).
- [ ] **Step 6:** `Logo`: usa `/logo.jpg` (negro sobre blanco). Claro: `mix-blend-multiply`; oscuro: `dark:invert dark:mix-blend-screen`. `variant="mark"` recorta solo la barba (contenedor `overflow-hidden` + `object-position` superior); `"full"` muestra la imagen completa. `alt="El Barbudo"`.
- [ ] **Step 7:** `site.ts` con datos de ejemplo plausibles de Asunción (marcar en comentario que son de prueba). `about.body` de 2 párrafos cortos.
- [ ] **Step 8:** `npm run dev`, página temporal con `<Logo/>`, `<ThemeToggle/>` y un párrafo: alternar tema → fondo cambia entre `#F7F5F0` y `#121212` y el logo se lee en ambos. `npm run build` → sin errores.
- [ ] **Step 9:** Commit `chore: scaffold Next.js con tokens de marca y tema claro/oscuro`.

---

### Task 2: Lógica de dominio (dinero, WhatsApp, stock)

**Files:**
- Create: `src/lib/money.ts`, `src/lib/whatsapp.ts`, `src/lib/stock.ts`
- Test: `tests/lib/money.test.ts`, `tests/lib/whatsapp.test.ts`, `tests/lib/stock.test.ts`

**Interfaces:**
- Produces: `formatPYG(amount: number): string`
- Produces: `parseGuaranies(input: string): number | null`
- Produces: `type OrderLine = { name: string; variantLabel?: string | null; quantity: number; unitPrice: number }`
- Produces: `buildOrderMessage(lines: OrderLine[]): string`, `buildInquiryMessage(productName: string): string`, `buildBookingMessage(serviceName: string): string`, `whatsappUrl(text: string, phone?: string): string`
- Produces: `isSoldOut(variants: { stock: number }[]): boolean`, `clampQuantity(requested: number, stock: number): number`, `minPrice(variants: { price: number }[]): number`

- [ ] **Step 1: Tests de dinero**

```ts
expect(formatPYG(285000)).toBe("₲ 285.000");
expect(formatPYG(0)).toBe("₲ 0");
expect(formatPYG(1250000)).toBe("₲ 1.250.000");
expect(parseGuaranies("285.000")).toBe(285000);
expect(parseGuaranies(" 285 000 ")).toBe(285000);
expect(parseGuaranies("285000")).toBe(285000);
expect(parseGuaranies("0")).toBe(0);
for (const bad of ["", "-5", "12,5", "abc", "1.2.3a"]) expect(parseGuaranies(bad)).toBeNull();
```

- [ ] **Step 2:** `npm test` → FAIL (módulo inexistente).
- [ ] **Step 3:** `formatPYG` = `"₲ " + new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(amount)` (no usar `style: "currency"`: su salida varía según ICU). `parseGuaranies`: quitar espacios y puntos; aceptar solo `/^\d+$/`.
- [ ] **Step 4: Tests de WhatsApp**

```ts
const lines = [
  { name: "Noir Intense", variantLabel: "100 ml", quantity: 1, unitPrice: 285000 },
  { name: "Aceite de barba", quantity: 2, unitPrice: 95000 },
];
expect(buildOrderMessage(lines)).toBe(
  "Hola El Barbudo 👋 Quiero pedir:\n" +
  "• 1 × Noir Intense (100 ml) — ₲ 285.000\n" +
  "• 2 × Aceite de barba — ₲ 190.000\n" +
  "Total: ₲ 475.000"
);
expect(buildInquiryMessage("Noir Intense")).toBe("Hola El Barbudo, ¿tienen disponible Noir Intense?");
expect(buildBookingMessage("Corte + barba")).toBe("Hola El Barbudo, quiero reservar un turno para Corte + barba");
expect(whatsappUrl("a", "+595 981 123-456")).toBe("https://wa.me/595981123456?text=a");
const tricky = "Café & Co #1?\nsí 👋";
expect(decodeURIComponent(new URL(whatsappUrl(tricky, "595981123456")).search.slice(6))).toBe(tricky);
// sin phone y sin env → usa site.whatsapp (vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", ""))
```

- [ ] **Step 5:** `npm test` → FAIL.
- [ ] **Step 6:** Implementar en `whatsapp.ts`. La etiqueta de variante va entre paréntesis solo si `variantLabel` es no vacío (el llamador la pasa solo cuando el producto tiene más de una variante). `whatsappUrl`: `phone ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || site.whatsapp`, quitar no-dígitos, `encodeURIComponent(text)`.
- [ ] **Step 7: Tests de stock**

```ts
expect(isSoldOut([{ stock: 0 }, { stock: 0 }])).toBe(true);
expect(isSoldOut([{ stock: 0 }, { stock: 3 }])).toBe(false);
expect(isSoldOut([])).toBe(true);
expect(clampQuantity(5, 3)).toBe(3);
expect(clampQuantity(0, 3)).toBe(1);
expect(clampQuantity(2, 0)).toBe(0);
expect(clampQuantity(2.7, 10)).toBe(2);
expect(minPrice([{ price: 450000 }, { price: 285000 }])).toBe(285000);
```

- [ ] **Step 8:** Implementar `stock.ts`; `npm test` → PASS todo.
- [ ] **Step 9:** Commit `feat: lógica de precios, mensajes de WhatsApp y stock`.

---

### Task 3: Base de datos, seed y lecturas

**Files:**
- Create: `prisma/schema.prisma`, `prisma.config.ts`, `prisma/seed.ts`, `src/lib/types.ts`, `src/lib/db.ts`, `src/lib/products.ts`, `src/lib/services.ts`
- Test: `tests/lib/products.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  - `type Category = "perfume" | "barba" | "cabello"`, `CATEGORIES: { value: Category; label: string; slug: string }[]` con labels "Perfumes", "Barba", "Cabello" y slugs `perfumes`, `barba`, `cabello`.
  - `type Notes = { top: string; heart: string; base: string }`
  - `type VariantDTO = { id: string; label: string; price: number; stock: number }`
  - `type ProductDTO = { id: string; slug: string; name: string; subtitle: string; category: Category; description: string; notes: Notes | null; benefits: string[]; tags: string[]; images: string[]; featured: boolean; active: boolean; variants: VariantDTO[] }`
  - `type ServiceDTO = { id: string; name: string; description: string; price: number; order: number }`
  - `type VariantSnapshot = { id: string; price: number; stock: number; available: boolean }` (`available` = variante existe y su producto está activo)
- Produces (`products.ts`): `toProductDTO(row): ProductDTO`, `pickRelated(product: ProductDTO, candidates: ProductDTO[], limit?: number): ProductDTO[]`, `listProducts(opts?: { category?: Category; tag?: string; featuredOnly?: boolean; includeInactive?: boolean }): Promise<ProductDTO[]>`, `getProductBySlug(slug: string): Promise<ProductDTO | null>`, `getProductById(id: string): Promise<ProductDTO | null>` (incluye inactivos, para admin), `listTags(): Promise<string[]>`, `getVariantSnapshots(ids: string[]): Promise<VariantSnapshot[]>`
- Produces (`services.ts`): `listServices(): Promise<ServiceDTO[]>` ordenado por `order`.
- Produces: `prisma` exportado desde `db.ts`.

- [ ] **Step 1:** Instalar `prisma@7 @prisma/client@7 @prisma/adapter-better-sqlite3 better-sqlite3` y dev `tsx`. Schema: `Product { id cuid, slug unique, name, subtitle, category String, description, notes String? (JSON), benefits String @default("[]"), tags String @default("[]"), images String @default("[]"), featured Boolean @default(false), active Boolean @default(true), createdAt, variants Variant[] }`, `Variant { id cuid, productId, label, price Int, stock Int @default(0), product relation onDelete: Cascade }`, `Service { id cuid, name, description, price Int, order Int @default(0) }`. Sin enums ni arrays nativos (portabilidad a Postgres). `benefits` = ingredientes/beneficios para barba/cabello (decisión del builder, el spec lo pide en la ficha).
- [ ] **Step 2:** `db.ts`: singleton en `globalThis` con el adapter de better-sqlite3 leyendo `DATABASE_URL` (`file:./dev.db`). Seguir la guía de Prisma 7 para `prisma.config.ts` (datasource y `migrations.seed: "tsx prisma/seed.ts"`).
- [ ] **Step 3: Tests de mapeo y relacionados** (sin base; filas construidas a mano)

```ts
const dto = toProductDTO({ ...row, tags: '["amaderado","noche"]', images: "no-json", notes: null, benefits: "[]" , variants: [] });
expect(dto.tags).toEqual(["amaderado", "noche"]);
expect(dto.images).toEqual([]);            // JSON roto → []
expect(dto.category).toBe("perfume");
// pickRelated: excluye el propio producto e inactivos; prioriza misma categoría, luego etiqueta compartida; respeta limit (default 4)
expect(pickRelated(p, [p, sameCat, sharedTag, unrelated, inactiveSameCat]).map(x => x.id)).toEqual([sameCat.id, sharedTag.id]);
```

- [ ] **Step 4:** `npm test` → FAIL. Implementar `toProductDTO` y `pickRelated` → PASS.
- [ ] **Step 5:** Implementar las lecturas Prisma. `listProducts` filtra `active: true` salvo `includeInactive`; `tag` filtra en memoria tras parsear (SQLite no consulta JSON). `getProductBySlug` devuelve `null` si inactivo. Orden: destacados primero, luego `createdAt` desc.
- [ ] **Step 6: Seed** (idempotente: borra y recrea). 12 productos: 7 perfumes de diseñador/nicho conocidos con sus notas reales de salida/corazón/fondo (ej. Bleu de Chanel, Dior Sauvage, Creed Aventus, Tom Ford Oud Wood, YSL Y, Versace Eros, Acqua di Giò Profumo), 3 de barba (aceite, bálsamo, shampoo de barba) y 2 de cabello (pomada mate, cera). Al menos 3 perfumes con variantes "50 ml" y "100 ml"; 1 producto con todo el stock en 0; 4 destacados; precios plausibles en guaraníes (perfumes ₲ 350.000–1.900.000, cuidado ₲ 60.000–150.000); 1–2 fotos de Unsplash por producto; etiquetas de un vocabulario chico (amaderado, fresco, cítrico, especiado, dulce, noche, día, intenso, suave, natural). 6 servicios: Corte clásico, Corte + barba, Perfilado de barba, Afeitado con navaja, Corte infantil, Tratamiento capilar.
- [ ] **Step 7:** `npx prisma migrate dev --name init` y `npx prisma db seed` → sin errores; `npx prisma studio` o un script corto muestra 12 productos y 6 servicios.
- [ ] **Step 8:** Commit `feat: modelo de datos, seed y lecturas de productos`.

---

### Task 4: Store del carrito

**Files:**
- Create: `src/stores/cart.ts`
- Test: `tests/stores/cart.test.ts`

**Interfaces:**
- Consumes: `clampQuantity`, `OrderLine`, `VariantSnapshot`.
- Produces: `type CartItem = { variantId: string; productId: string; slug: string; name: string; variantLabel: string | null; unitPrice: number; image: string | null; quantity: number; maxStock: number }`
- Produces: `useCart` (Zustand, `persist` con key `"elbarbudo-cart"`, persiste solo `items`) con estado `{ items: CartItem[]; isOpen: boolean }` y acciones `add(item: Omit<CartItem, "quantity">, qty: number): void`, `setQuantity(variantId: string, qty: number): void` (≤ 0 elimina), `remove(variantId: string): void`, `clear(): void`, `open(): void`, `close(): void`, `reconcile(snapshots: VariantSnapshot[]): { removed: string[]; adjusted: string[] }` (nombres para el aviso).
- Produces: selectores puros `cartCount(items): number`, `cartTotal(items): number`, `toOrderLines(items): OrderLine[]`.

- [ ] **Step 1: Tests**

```ts
add(noir100, 2); add(noir100, 5);            // maxStock 4
expect(items[0].quantity).toBe(4);            // fusiona por variantId y recorta
add(aceite, 1); expect(cartCount(items)).toBe(5);
expect(cartTotal(items)).toBe(4 * 285000 + 95000);
setQuantity(aceite.variantId, 0); expect(items).toHaveLength(1);
// reconcile: precio cambió, stock bajó, otra variante agotada, otra borrada
const r = reconcile([{ id: noir100.variantId, price: 300000, stock: 2, available: true }, { id: soldOut.variantId, price: 1, stock: 0, available: true }]);
expect(items.find(i => i.variantId === noir100.variantId)).toMatchObject({ unitPrice: 300000, quantity: 2, maxStock: 2 });
expect(r.adjusted).toEqual(["Noir Intense"]);
expect(r.removed.sort()).toEqual(["Producto agotado", "Producto borrado"].sort());
expect(toOrderLines(items)[0]).toEqual({ name: "Noir Intense", variantLabel: "100 ml", quantity: 2, unitPrice: 300000 });
```

- [ ] **Step 2:** `npm test` → FAIL. Implementar → PASS. (Resetear el store en `beforeEach` con `useCart.setState`.) Un precio que cambia solo actualiza; `adjusted` lista solo ítems cuya cantidad bajó.
- [ ] **Step 3:** Commit `feat: carrito persistente con reconciliación de stock`.

---

### Task 5: Estructura de tienda (header, footer, piezas UI)

**Files:**
- Create: `src/app/(shop)/layout.tsx`, `src/components/shop/Header.tsx`, `Footer.tsx`, `CartButton.tsx`, `src/components/ui/Button.tsx`, `Chip.tsx`, `Reveal.tsx`, `SafeImage.tsx`, `src/app/(shop)/not-found.tsx`
- Modify: `next.config.ts`
- Delete: página temporal de Task 1 (`src/app/page.tsx`)

**Interfaces:**
- Consumes: `site`, `Logo`, `ThemeToggle`, `useCart`, `cartCount`, `CATEGORIES`.
- Produces: `<Button variant="primary" | "secondary" | "accent" | "whatsapp" size="md" | "sm" href? ...>` (renderiza `<a>` si hay `href`, si no `<button>`; `primary` = fondo `fg` texto `bg`; `accent` = bronce con texto `#141414`; `whatsapp` = `#25D366` con texto `#0B2A17`; pill, altura ≥ 44 px).
- Produces: `<Chip href? active?>`, `<Reveal delay?>` (fade + subida 12 px, 250 ms, `whileInView` una vez; sin animación si `useReducedMotion()`), `<SafeImage>` (envuelve `next/image`; `onError` → bloque `bg-surface` con ícono `ImageOff` en `text-muted`).

- [ ] **Step 1:** `next.config.ts`: `images.remotePatterns: [{ protocol: "https", hostname: "**" }]`.
- [ ] **Step 2:** `Header` (sticky, 56 px, `bg-bg/90` + borde inferior al hacer scroll): `<Logo variant="mark"/>` + "EL BARBUDO" en serif con tracking amplio, enlazado a `/`; en desktop nav visible "Perfumes · Barba · Cabello · Servicios" (servicios → `/#servicios`); en móvil menú en `<dialog>` con esos mismos enlaces; a la derecha `ThemeToggle` y `CartButton`. En la portada el header arranca transparente con texto claro sobre el hero y pasa a sólido tras 80 px de scroll (prop `overHero`).
- [ ] **Step 3:** `CartButton`: ícono `ShoppingBag`, badge con `cartCount` (solo tras hidratar), `aria-label="Abrir carrito, N productos"`, llama `open()`.
- [ ] **Step 4:** `Footer`: Logo `full`, dirección con enlace a `mapsUrl`, horarios, Instagram, botón WhatsApp (`whatsappUrl("Hola El Barbudo")`), año.
- [ ] **Step 5:** `not-found.tsx`: titular serif "No encontramos esta página", texto corto, botón "Ver catálogo".
- [ ] **Step 6:** `(shop)/layout.tsx` monta Header, `<main>`, Footer y un slot para `CartDrawer` (se completa en Task 9; por ahora nada). `(shop)/template.tsx` envuelve cada página en un fade de entrada de 200 ms (transición de página; nada con reduced-motion).
- [ ] **Step 7:** Verificar en navegador a 375 px y 1280 px, claro y oscuro: header, menú móvil abre/cierra con teclado (Esc cierra, foco vuelve al botón), `/no-existe` muestra el 404 de marca.
- [ ] **Step 8:** Commit `feat: layout de tienda con header, footer y 404`.

---

### Task 6: Portada

**Files:**
- Create: `src/app/(shop)/page.tsx`, `src/components/shop/Hero.tsx`, `CategoryLinks.tsx`, `ProductCard.tsx`, `ProductGrid.tsx`, `AboutSection.tsx`, `ServicesList.tsx`
- Test: `tests/components/ProductCard.test.tsx`

**Interfaces:**
- Consumes: `listProducts({ featuredOnly: true })`, `listServices()`, `site`, `formatPYG`, `minPrice`, `isSoldOut`, `whatsappUrl`, `buildOrderMessage`, `buildInquiryMessage`, `buildBookingMessage`.
- Produces: `<ProductCard product={ProductDTO} />`, `<ProductGrid products={ProductDTO[]} empty?: ReactNode />` (2 cols móvil, 3 tablet, 4 desktop).

- [ ] **Step 1: Test de tarjeta**

```tsx
render(<ProductCard product={perfumeTwoVariants} />);           // 50 ml ₲ 450.000 / 100 ml ₲ 650.000
expect(screen.getByText("Desde ₲ 450.000")).toBeInTheDocument();
expect(screen.getByRole("link", { name: /pedir .* por whatsapp/i })).toHaveAttribute("href", expect.stringContaining("wa.me"));
render(<ProductCard product={soldOutProduct} />);
expect(screen.getByText("Agotado")).toBeInTheDocument();
expect(screen.getByRole("link", { name: /consultar/i }).getAttribute("href")).toContain(encodeURIComponent("¿tienen disponible"));
```

- [ ] **Step 2:** `npm test` → FAIL. Implementar `ProductCard`: enlace a `/productos/[slug]` en imagen y nombre; subtítulo; precio (`formatPYG` si 1 variante, `"Desde " + formatPYG(minPrice)` si varias); botón redondo bronce 44 px con ícono WhatsApp (`aria-label="Pedir {nombre} por WhatsApp"`, mensaje con la variante más barata, cantidad 1); agotado → tarjeta con `opacity` en la imagen solamente, etiqueta "Agotado", botón "Consultar". Hover: imagen `scale-105` 300 ms, tarjeta sube 2 px. → PASS.
- [ ] **Step 3:** `Hero`: `100svh` en móvil, `85vh` desktop; foto de Unsplash `priority` cubriendo; velo `bg-black/45`; texto claro siempre (ambos modos): línea "PERFUMERÍA · BARBA · CABELLO" 12 px tracking 0.16em, titular serif 44 px móvil / 80 px desktop (propuesta: "Lo esencial, bien hecho."), `Button primary` invertido "Ver catálogo" → `/productos`, botón secundario contorno blanco "Escribinos" con ícono WhatsApp. Entrada con `Reveal` escalonado.
- [ ] **Step 4:** `CategoryLinks`: 3 enlaces grandes (Perfumes, Barba, Cabello) a `/productos?categoria=<slug>`, ícono lucide en bronce (`SprayCan`, `Sparkles` o similar, `Scissors`), en fila de 3.
- [ ] **Step 5:** `AboutSection` (`site.about`, foto + texto, 2 columnas desktop) y `ServicesList` (`id="servicios"`, lista con filas separadas por borde: nombre serif, descripción, precio, enlace "Reservar" → `whatsappUrl(buildBookingMessage(name))`).
- [ ] **Step 6:** `page.tsx` (`dynamic = "force-dynamic"`): Hero → CategoryLinks → "Destacados" (`ProductGrid` + enlace "Ver todo") → AboutSection → ServicesList; secciones envueltas en `Reveal`.
- [ ] **Step 7:** Verificar en navegador a 375 px y 1280 px, ambos modos: hero ocupa la primera pantalla, header transparente → sólido al scrollear, botones WhatsApp abren `wa.me` con el texto correcto, sin scroll horizontal.
- [ ] **Step 8:** Commit `feat: portada con hero, categorías, destacados, marca y servicios`.

---

### Task 7: Catálogo con filtros

**Files:**
- Create: `src/app/(shop)/productos/page.tsx`, `src/app/(shop)/productos/loading.tsx`, `src/components/shop/CatalogFilters.tsx`

**Interfaces:**
- Consumes: `listProducts({ category, tag })`, `listTags()`, `CATEGORIES`, `ProductGrid`, `Chip`.
- Produces: URL `/productos?categoria=<slug>&etiqueta=<tag>`; slug desconocido = sin filtro.

- [ ] **Step 1:** `page.tsx` (`dynamic = "force-dynamic"`, `searchParams` como Promise en Next 16): título serif con la categoría activa o "Todos los productos", contador "N productos", `CatalogFilters`, `ProductGrid` con `empty` = "No hay productos en esta categoría todavía" + enlace "Ver todos".
- [ ] **Step 2:** `CatalogFilters`: fila de chips de categoría ("Todos" + 3) y fila de chips de etiquetas, ambas como enlaces (funcionan sin JS), scroll horizontal en móvil, chip activo `aria-current="page"`; el filtro de etiqueta se conserva al cambiar categoría y viceversa.
- [ ] **Step 3:** `loading.tsx`: 8 tarjetas skeleton con la misma grilla (bloque `bg-surface` con `animate-pulse`, sin pulse en reduced-motion).
- [ ] **Step 4:** Verificar: `/productos?categoria=barba` muestra solo barba; añadir `&etiqueta=amaderado` combina; `?categoria=xyz` muestra todos; combinación vacía muestra el estado vacío.
- [ ] **Step 5:** Commit `feat: catálogo con filtros por categoría y etiqueta`.

---

### Task 8: Ficha de producto

**Files:**
- Create: `src/app/(shop)/productos/[slug]/page.tsx`, `src/components/shop/ProductGallery.tsx`, `src/components/shop/ProductPurchase.tsx`
- Test: `tests/components/ProductPurchase.test.tsx`

**Interfaces:**
- Consumes: `getProductBySlug`, `listProducts`, `pickRelated`, `useCart().add/open`, `clampQuantity`, `isSoldOut`, `whatsappUrl`, `buildOrderMessage`, `buildInquiryMessage`.
- Produces: `<ProductPurchase product={ProductDTO} />` (client): selector de variante, stepper de cantidad, "Pedir ahora", "Agregar al carrito", barra fija inferior en móvil.

- [ ] **Step 1: Test de compra**

```tsx
render(<ProductPurchase product={perfumeTwoVariants} />);   // 50 ml stock 3, 100 ml stock 0
expect(screen.getByRole("radio", { name: /100 ml/ })).toBeDisabled();       // variante sin stock no seleccionable
await user.click(screen.getByRole("button", { name: "Aumentar cantidad" })); // ×3
await user.click(screen.getByRole("button", { name: "Aumentar cantidad" }));
await user.click(screen.getByRole("button", { name: "Aumentar cantidad" }));
expect(screen.getByLabelText("Cantidad")).toHaveTextContent("3");           // tope = stock
expect(screen.getAllByRole("link", { name: /pedir ahora/i })[0].getAttribute("href"))
  .toContain(encodeURIComponent("• 3 × Bleu de Chanel (50 ml) — ₲ 1.350.000"));
await user.click(screen.getByRole("button", { name: /agregar al carrito/i }));
expect(useCart.getState().items[0]).toMatchObject({ quantity: 3, variantLabel: "50 ml" });
expect(useCart.getState().isOpen).toBe(true);
// producto agotado: no hay "Pedir ahora" ni "Agregar"; hay enlace "Consultar disponibilidad"
```

- [ ] **Step 2:** `npm test` → FAIL. Implementar `ProductPurchase`: variantes como radio group de pills (`fieldset`/`legend` "Tamaño"; solo si hay > 1 variante; selecciona por defecto la primera con stock); al cambiar variante la cantidad se recorta; stepper con botones 44 px y `aria-label` "Disminuir cantidad"/"Aumentar cantidad", valor con `aria-label="Cantidad"` y `aria-live="polite"`; precio actual (`formatPYG(unitPrice × qty)` grande, unitario chico debajo si qty > 1); "Pedir ahora" (`Button accent`, ícono WhatsApp, `target="_blank" rel="noopener"`) y "Agregar al carrito" (`Button secondary`; agrega y abre el drawer). La etiqueta de variante va al mensaje y al carrito solo si hay > 1 variante. En < 768 px una barra fija abajo con precio + "Pedir ahora" aparece cuando el bloque principal sale de vista (IntersectionObserver), con `padding-bottom: env(safe-area-inset-bottom)`; la página reserva ese alto para no tapar el footer. → PASS.
- [ ] **Step 3:** `ProductGallery`: imagen principal 4:5 con `SafeImage`; si hay > 1, miniaturas como botones (`aria-label="Ver imagen N"`) y swipe horizontal con scroll-snap en móvil.
- [ ] **Step 4:** `page.tsx` (`dynamic = "force-dynamic"`): `notFound()` si `getProductBySlug` es `null`; `generateMetadata` con nombre y descripción. Layout 2 columnas desktop (galería | info), 1 columna móvil. Info: categoría (enlace al catálogo filtrado) 12 px tracking, nombre serif 36–48 px, subtítulo, indicador "En stock" (`text-ok` + ícono `Check`) o "Agotado", `ProductPurchase`, descripción, notas olfativas como 3 filas "Salida / Corazón / Fondo" si hay `notes`, si no lista de `benefits` con título "Lo que hace", chips de etiquetas enlazados a `/productos?etiqueta=`. Al final "También te puede gustar" con `pickRelated(product, await listProducts())` en `ProductGrid` (oculto si vacío).
- [ ] **Step 5:** Verificar en navegador: un perfume con 2 tamaños, uno de barba con 1 variante, el agotado, un slug inexistente (→ 404 de marca), y una imagen con URL rota en la base (→ placeholder). Barra fija aparece y no tapa contenido a 375 px.
- [ ] **Step 6:** Commit `feat: ficha de producto con variantes, notas y relacionados`.

---

### Task 9: Drawer del carrito

**Files:**
- Create: `src/components/shop/CartDrawer.tsx`, `src/app/(shop)/actions.ts`
- Modify: `src/app/(shop)/layout.tsx`
- Test: `tests/components/CartDrawer.test.tsx`

**Interfaces:**
- Consumes: `useCart`, `cartTotal`, `toOrderLines`, `buildOrderMessage`, `whatsappUrl`, `getVariantSnapshots`.
- Produces: Server Action `refreshCart(variantIds: string[]): Promise<VariantSnapshot[]>` en `(shop)/actions.ts` (`"use server"`, sin auth: solo lectura).

- [ ] **Step 1: Test**

```tsx
// refreshCart mockeado (vi.mock) devuelve stock 1 para un ítem con qty 3 y available:false para otro
useCart.setState({ items: [noirQty3, borrado], isOpen: true });
render(<CartDrawer />);
expect(await screen.findByRole("status")).toHaveTextContent(/Ajustamos la cantidad de Noir Intense.*Ya no está disponible: Producto borrado/s);
expect(screen.getByText("₲ 285.000")).toBeInTheDocument();                 // total recalculado
expect(screen.getByRole("link", { name: /enviar pedido por whatsapp/i }).getAttribute("href"))
  .toContain(encodeURIComponent("Total: ₲ 285.000"));
// carrito vacío: titular "Tu carrito está vacío", botón "Ver catálogo", sin botón de WhatsApp
```

- [ ] **Step 2:** `npm test` → FAIL. Implementar: `<dialog>` nativo abierto con `showModal()` cuando `isOpen`, panel a la derecha (ancho 420 px desktop, 100% móvil), entra deslizando 250 ms; Esc, clic en backdrop y botón "Cerrar" llaman `close()`; foco al título al abrir, vuelve al disparador al cerrar. Al abrir: `refreshCart(ids)` → `reconcile` → si hay cambios, aviso `role="status"` con los nombres. Filas: miniatura, nombre (+ variante), stepper con tope `maxStock`, botón "Quitar" con `aria-label="Quitar {nombre}"`, subtotal. Pie: "Total estimado", nota "Confirmamos stock, entrega y pago por WhatsApp.", vista previa del mensaje en bloque `bg-surface` con borde izquierdo bronce y `white-space: pre-line`, `Button whatsapp` "Enviar pedido por WhatsApp" (`target="_blank"`). El carrito no se vacía al enviar (el cliente puede volver). → PASS.
- [ ] **Step 3:** Montar `CartDrawer` en `(shop)/layout.tsx`.
- [ ] **Step 4:** Verificar en navegador: agregar 2 productos, recargar → siguen; abrir drawer, el mensaje coincide con el formato del spec; a 375 px el botón verde queda en la zona del pulgar.
- [ ] **Step 5:** Commit `feat: drawer del carrito con pedido por WhatsApp`.

---

### Task 10: Autenticación del admin

**Files:**
- Create: `src/lib/auth.ts`, `src/app/admin/login/page.tsx`, `src/app/admin/login/actions.ts`, `src/app/admin/(panel)/layout.tsx`
- Test: `tests/lib/auth.test.ts`

**Interfaces:**
- Produces: `verifyPassword(input: string, expected?: string): boolean` (`expected` default `process.env.ADMIN_PASSWORD`; `false` si alguno está vacío; compara SHA-256 de ambos con `crypto.timingSafeEqual`).
- Produces: `getSession(): Promise<IronSession<{ isAdmin?: boolean }>>` (cookie `eb_admin`, `httpOnly`, `secure` en producción, `sameSite: "lax"`, 7 días, `password: process.env.SESSION_SECRET`), `requireAdmin(): Promise<void>` (redirige a `/admin/login` si no hay sesión).
- Produces: Server Actions `login(prev: { error?: string }, formData: FormData): Promise<{ error?: string }>`, `logout(): Promise<void>`.

- [ ] **Step 1: Tests**

```ts
expect(verifyPassword("barba123", "barba123")).toBe(true);
expect(verifyPassword("barba12", "barba123")).toBe(false);
expect(verifyPassword("", "")).toBe(false);
expect(verifyPassword("x", undefined)).toBe(false);   // sin ADMIN_PASSWORD configurada nunca entra
```

- [ ] **Step 2:** `npm test` → FAIL. Implementar → PASS.
- [ ] **Step 3:** Login: página centrada con `Logo full`, un solo campo "Contraseña" (label arriba, `type="password"`, `autoComplete="current-password"`), botón "Entrar"; `useActionState`; error "Contraseña incorrecta." junto al campo. Éxito → `/admin`. `(panel)/layout.tsx` llama `requireAdmin()` y pinta una barra superior con "Productos", "Servicios", "Ver tienda" y "Salir" (form con `logout`). Admin siempre `font-sans`, mismos tokens de color.
- [ ] **Step 4:** Verificar: `/admin` sin sesión → `/admin/login`; contraseña mala → error; buena → panel; "Salir" → vuelve al login.
- [ ] **Step 5:** Commit `feat: acceso al admin con contraseña única`.

---

### Task 11: Admin de productos (stock, precio, crear/editar)

**Files:**
- Create: `src/app/admin/(panel)/page.tsx`, `src/app/admin/(panel)/productos/nuevo/page.tsx`, `src/app/admin/(panel)/productos/[id]/page.tsx`, `src/app/admin/actions.ts`, `src/lib/validation.ts`, `src/components/admin/ProductRow.tsx`, `src/components/admin/ProductForm.tsx`
- Test: `tests/lib/validation.test.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `listProducts({ includeInactive: true })`, `getProductById`, `parseGuaranies`, `prisma`.
- Produces (`validation.ts`): `productSchema` (Zod) que recibe los campos del formulario como strings y produce `{ name: string; slug: string; subtitle: string; category: Category; description: string; notes: Notes | null; benefits: string[]; tags: string[]; images: string[]; featured: boolean; active: boolean; variants: { id?: string; label: string; price: number; stock: number }[] }`; `slugify(name: string): string`.
- Produces (`actions.ts`): `updateVariant(variantId: string, data: { price?: string; stock?: string }): Promise<{ ok: true } | { error: string }>`, `saveProduct(prev: FormState, formData: FormData): Promise<FormState>` con `FormState = { errors?: Record<string, string>; message?: string }`, `toggleProductFlag(id: string, flag: "featured" | "active"): Promise<void>`. Cada una: `await requireAdmin()` primero; tras escribir, `revalidatePath("/", "layout")`.

- [ ] **Step 1: Tests de validación**

```ts
expect(slugify("Bleu de Chanel Eau de Parfum")).toBe("bleu-de-chanel-eau-de-parfum");
expect(slugify("Ácido & Cítrico")).toBe("acido-citrico");
const ok = productSchema.safeParse(form({ variants: [{ label: "100 ml", price: "285.000", stock: "4" }], tags: "amaderado, noche", images: "https://x.com/a.jpg\nhttps://x.com/b.jpg" }));
expect(ok.data.variants[0]).toMatchObject({ price: 285000, stock: 4 });
expect(ok.data.tags).toEqual(["amaderado", "noche"]);
const bad = productSchema.safeParse(form({ name: "", variants: [{ label: "", price: "-5", stock: "1,5" }], images: "http://inseguro.com/a.jpg" }));
expect(fieldErrors(bad)).toMatchObject({
  name: "Escribí el nombre del producto.",
  "variants.0.label": "Escribí el tamaño o presentación.",
  "variants.0.price": "Ingresá un precio en guaraníes, sin decimales.",
  "variants.0.stock": "Ingresá un número entero, 0 o más.",
  images: "Cada foto tiene que ser una URL que empiece con https://",
});
expect(productSchema.safeParse(form({ variants: [] })).success).toBe(false);  // al menos una variante
```

- [ ] **Step 2:** `npm test` → FAIL. Implementar `validation.ts` (precio y stock pasan por `parseGuaranies`; tags separadas por coma, en minúscula, sin vacíos ni duplicados; imágenes una por línea; notas: las 3 o ninguna; `fieldErrors(result): Record<string,string>` helper exportado) → PASS.
- [ ] **Step 3:** Panel `/admin`: encabezado "Productos" + botón "Nuevo producto"; tabla (en móvil, lista de filas apiladas) con miniatura, nombre (enlace a editar), categoría, y por variante campos en línea de precio y stock (`inputMode="numeric"`) que guardan al perder foco o con Enter vía `updateVariant` con feedback "Guardado" inline durante 2 s o el error junto al campo; botón "Marcar agotado" pone stock 0; switches "Destacado" y "Activo". Filtro por categoría arriba.
- [ ] **Step 4:** `ProductForm` (crear y editar, mismo componente): secciones "Datos básicos" (nombre, slug autogenerado editable, subtítulo, categoría `select`, descripción), "Variantes" (filas tamaño/precio/stock, "Agregar variante", "Quitar"; no se puede quitar la última), "Notas olfativas" (visible si categoría = perfume: salida, corazón, fondo), "Ingredientes o beneficios" (si no es perfume: uno por línea), "Etiquetas", "Fotos" (URLs, una por línea, con vista previa de miniaturas), "Visibilidad" (destacado, activo). Labels arriba, validación en blur, al enviar errores junto a cada campo + resumen arriba con enlaces a los campos. Guardar → vuelve a `/admin` con toast "Producto guardado". Slug repetido → error en el campo slug "Ya existe un producto con esta dirección.". Editar actualiza variantes por `id`, crea nuevas y borra las quitadas.
- [ ] **Step 5:** Verificar en navegador: cambiar stock de un producto a 0 → en la tienda aparece "Agotado"; escribir `350.000` en precio → se guarda y la tienda muestra `₲ 350.000`; crear un producto de cabello y verlo en `/productos?categoria=cabello`; desactivar uno → su URL da 404. Llamar a una action sin sesión (desde otra ventana tras "Salir") redirige al login sin escribir.
- [ ] **Step 6:** Commit `feat: admin de productos con stock, precios y formulario`.

---

### Task 12: Admin de servicios

**Files:**
- Create: `src/app/admin/(panel)/servicios/page.tsx`, `src/components/admin/ServiceForm.tsx`
- Modify: `src/app/admin/actions.ts`, `src/lib/validation.ts`
- Test: `tests/lib/validation.test.ts` (añadir casos)

**Interfaces:**
- Consumes: `listServices`, `requireAdmin`, `parseGuaranies`.
- Produces: `serviceSchema` (`{ name: string; description: string; price: number; order: number }`), Server Actions `saveService(prev: FormState, formData: FormData): Promise<FormState>` (crea o actualiza según `id`), `deleteService(id: string): Promise<void>`, `moveService(id: string, direction: "up" | "down"): Promise<void>`.

- [ ] **Step 1: Tests**

```ts
expect(serviceSchema.safeParse({ name: "Corte clásico", description: "", price: "80.000", order: "1" }).data.price).toBe(80000);
expect(fieldErrors(serviceSchema.safeParse({ name: "", description: "", price: "abc", order: "1" })))
  .toMatchObject({ name: "Escribí el nombre del servicio.", price: "Ingresá un precio en guaraníes, sin decimales." });
```

- [ ] **Step 2:** `npm test` → FAIL. Implementar schema → PASS.
- [ ] **Step 3:** Página `/admin/servicios`: lista ordenada con nombre, precio, botones "Subir"/"Bajar" (`aria-label` con el nombre), "Editar" (expande `ServiceForm` en línea) y "Eliminar" (confirmación con `<dialog>`: "¿Eliminar {nombre}? Esta acción no se puede deshacer." con "Eliminar" y "Cancelar" del mismo peso visual). "Nuevo servicio" abre el formulario vacío arriba. Todas las actions con `requireAdmin()` y `revalidatePath("/", "layout")`.
- [ ] **Step 4:** Verificar: editar el precio de "Corte + barba", reordenar, y comprobar en `/#servicios` de la portada.
- [ ] **Step 5:** Commit `feat: admin de servicios de barbería`.

---

### Task 13: Pulido, accesibilidad y documentación de despliegue

**Files:**
- Create: `README.md`
- Modify: lo que salga de la revisión

- [ ] **Step 1:** Recorrido completo del spec (sección Verificación 1–3) en el navegador integrado a 375 px y 1280 px, ambos modos de color; anotar y corregir lo que falle.
- [ ] **Step 2:** Navegación solo con teclado por portada → catálogo → ficha → carrito → enviar; foco visible en todo y nunca tapado por el header fijo ni la barra inferior (`scroll-margin-top`/`scroll-padding`).
- [ ] **Step 3:** Lighthouse (o axe) en portada, catálogo y ficha: accesibilidad ≥ 90; corregir contrastes y nombres accesibles que reporte.
- [ ] **Step 4:** Activar `prefers-reduced-motion` (DevTools) y comprobar que no queda movimiento.
- [ ] **Step 5:** `README.md`: requisitos, `cp .env.example .env`, `npm install`, `npx prisma migrate dev`, `npx prisma db seed`, `npm run dev`, `npm test`; sección "Desplegar en Vercel": crear base en Neon, cambiar `provider = "postgresql"` en `schema.prisma`, reemplazar el adapter de `db.ts` por `@prisma/adapter-pg` (o el que indique Prisma 7 para Postgres), borrar `prisma/migrations` y correr `npx prisma migrate dev --name init` contra Neon, `npx prisma db seed`, cargar las 4 variables de entorno en Vercel, `build` = `prisma generate && next build`. Nota: el logo actual es un JPG de 150 px; pedir a la marca un SVG.
- [ ] **Step 6:** `npm test` → todo PASS; `npm run lint` → sin errores; `rm dev.db && npx prisma migrate reset --force` → base y seed desde cero OK; `npm run build` → sin errores.
- [ ] **Step 7:** Commit `docs: README y pulido de accesibilidad`.

---

### Task 14: Portada = tienda (cambio pedido por el cliente, 2026-10-19)

> El cliente revisó la portada de la Task 6: "la idea es vender los productos, no mostrar qué hace". La portada pasa a ser la tienda. La marca y los servicios se mudan a `/barberia`. Se ejecuta después de la Task 8 y antes de la Task 9.

**Files:**
- Modify: `src/app/(shop)/page.tsx`, `src/components/shop/Header.tsx`, `src/app/globals.css`
- Create: `src/app/(shop)/barberia/page.tsx`, `src/components/shop/StoreIntro.tsx`, `src/components/shop/CategorySection.tsx`, `src/lib/home.ts`
- Delete: `src/components/shop/Hero.tsx` y `CategoryLinks.tsx` (y la keyframe `hero-in`) si quedan sin uso
- Test: `tests/lib/home.test.ts`

**Interfaces:**
- Consumes: `listProducts`, `listServices`, `ProductGrid`, `ProductCard`, `Chip`, `CATEGORIES`, `AboutSection`, `ServicesList`, `Button`, `site`.
- Produces: `groupByCategory(products: ProductDTO[], perSection?: number): { category: (typeof CATEGORIES)[number]; products: ProductDTO[]; total: number }[]` en `src/lib/home.ts`. Sigue el orden de `CATEGORIES`, omite las categorías vacías y usa `perSection` 4 por defecto.

- [ ] **Step 1: Test**

```ts
const groups = groupByCategory([perfume1, barba1, perfume2, perfume3, perfume4, perfume5, cabello1]);
expect(groups.map(g => g.category.value)).toEqual(["perfume", "barba", "cabello"]);
expect(groups[0].products).toHaveLength(4);
expect(groups[0].total).toBe(5);
expect(groupByCategory([barba1]).map(g => g.category.value)).toEqual(["barba"]);   // omite vacías
expect(groupByCategory([])).toEqual([]);
```

- [ ] **Step 2:** `npm test` → FAIL. Implementar → PASS.
- [ ] **Step 3: Portada `/`** (`dynamic = "force-dynamic"`). Todo lo que está sobre el pliegue se ve sin JS: no se usa `Reveal` hasta después de "Destacados". De arriba hacia abajo:
  - `StoreIntro`: banda compacta sin foto a pantalla completa. Línea chica con tracking ("PERFUMERÍA · BARBA · CABELLO"), h1 serif de 36 px en móvil y 56 px en desktop ("Perfumes y cuidado para el hombre"), y una línea de apoyo ("Elegí, pedí por WhatsApp y te confirmamos al toque."). Alto total ≤ 220 px en móvil. En el primer pantallazo a 375 px ya tienen que verse productos.
  - Fila de chips de categoría ("Todos", "Perfumes", "Barba", "Cabello") que linkean a `/productos?categoria=<slug>`. Usa `Chip`, scrollea horizontal en móvil.
  - "Destacados": `ProductGrid` con los productos destacados.
  - Una sección por categoría (`CategorySection`): título serif con el nombre de la categoría, enlace "Ver todos (N)" a `/productos?categoria=<slug>` y `ProductGrid` con hasta 4 productos. Los datos salen de `groupByCategory(await listProducts())`.
  - Al final, un bloque angosto (una fila, no un hero) de barbería: "¿Corte o barba? Reservá tu turno en la barbería." con `Button secondary` "Ver servicios" → `/barberia`.
- [ ] **Step 4: Página `/barberia`** (`dynamic = "force-dynamic"`): `AboutSection` + `ServicesList` (mantiene `id="servicios"`), con título de página serif "La barbería". `generateMetadata` → "La barbería — El Barbudo".
- [ ] **Step 5: Header**: queda sólido en todas las rutas, sin modo transparente sobre el hero (se quita la lógica `overHero`, sus tokens y el `-mb-14`). El ítem de nav "Servicios" (`/#servicios`) pasa a "La barbería" → `/barberia`, con `aria-current="page"` cuando estás ahí. Footer: si enlaza a `/#servicios`, apuntarlo a `/barberia`.
- [ ] **Step 6:** Borrar `Hero.tsx`, `CategoryLinks.tsx` y la keyframe `hero-in` si quedaron sin uso; borrar o actualizar los tests que los referencian. Si `site.about.image` se sigue usando, queda.
- [ ] **Step 7:** Verificar con curl y en el navegador a 375 px y 1280 px, en claro y en oscuro:
  - en `/` se ven productos en el primer pantallazo;
  - el header es sólido;
  - `/barberia` muestra marca y servicios con sus enlaces "Reservar";
  - no hay scroll horizontal.
- [ ] **Step 8:** Commit `feat: portada como tienda y página de la barbería`.
