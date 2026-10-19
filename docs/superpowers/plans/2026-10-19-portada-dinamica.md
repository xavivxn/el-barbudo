# Portada dinámica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la portada estática por una tienda dinámica con tres piezas: vitrina destacada (carrusel con tono por estilo), pestañas de categoría animadas y "Encontrá tu fragancia".

**Architecture:** La lógica pura vive en `src/lib/` y se prueba con Vitest: tono, selección de vitrina, coincidencia de fragancias y precio de tarjeta compartido. Hay tres componentes cliente en `src/components/shop/home/`, construidos sobre HTML que funciona sin JS (scroll-snap, paneles con `hidden`) y con `motion/react` para el movimiento. `src/app/(shop)/page.tsx` los compone a partir de `listProducts()`.

**Tech Stack:** Next.js 16 · React 19 · Tailwind 4 · motion/react 14 · Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-19-portada-dinamica-design.md`

## Global Constraints

- **Paleta exacta** (sin cambios), claro / oscuro:
  - fondo `#F7F5F0` / `#121212`
  - superficie `#FFFFFF` / `#1C1C1C`
  - texto `#141414` / `#F2EFE9`
  - texto secundario `#6B6762` / `#A39E95`
  - borde `#E6E2DA` / `#2E2C29`
  - bronce `#9A7B4F` / `#C9A66B`
- El bronce solo va como fondo de botón con texto `#141414`. Las clases Tailwind de tema existentes son `bg-bg`, `bg-surface`, `text-fg`, `text-muted`, `border-line`, `bg-accent`, `text-accent` y `text-ok`.
- **Tipografía:** Cormorant Garamond (`font-serif`) en títulos, Inter (`font-sans`) en el resto. El cuerpo va a 16 px o más.
- **Copy:** español con voseo, sin "por favor" y sin "!". Íconos `lucide-react`; para WhatsApp, `WhatsAppIcon`.
- **Accesibilidad:**
  - Contraste de texto ≥ 4.5:1 en ambos modos, también sobre los tonos de la vitrina.
  - Targets ≥ 44 px, foco visible, `cursor-pointer` en lo clickeable.
  - En vez de `disabled` nativo, `aria-disabled` + guard.
- **Movimiento:**
  - Solo `transform` y `opacity`, ease-out al entrar.
  - Micro-interacciones de 150–300 ms; vitrina y paneles de hasta 400 ms.
  - Nada infinito decorativo.
  - Con `prefers-reduced-motion`: sin auto-avance y sin parallax. El `MotionProvider` (`reducedMotion="user"`) y la regla CSS global ya existen.
- **Sin JS**, lo que está sobre el pliegue se tiene que ver: la vitrina no usa `Reveal`.
- **Precios:** regla R10. "Desde" y el pedido usan solo variantes con stock; un producto agotado muestra "Agotado" y "Consultar".
- `export const dynamic = "force-dynamic"` en la página.
- **Commits:** terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Destacados sin imagen o agotados en la vitrina.** Se muestra el placeholder de `SafeImage`; si está agotado, "Consultar" en vez de "Pedir ahora". → test en Task 2.
2. **Combinación del finder sin resultados exactos.** Se muestran coincidencias parciales con el aviso, nunca una sección vacía muda. → test en Task 1 (`matchFragrances`) y Task 4.
3. **Auto-avance mientras el usuario lee o navega con teclado.** Se pausa con hover, con foco dentro y con la pestaña oculta, y con reduced motion nunca arranca. → test en Task 2.
4. **Pestañas sin JS o con una categoría vacía.** Se ve el panel de Perfumes y los "Ver todos". Una categoría sin productos no tiene pestaña. → test en Task 3.
5. **Scroll horizontal de página en 375 px** por la vitrina o los rieles. Los rieles quedan contenidos (`overflow-x-auto` dentro del contenedor). → verificación en navegador en Task 4.

---

### Task 1: Lógica pura (tono, vitrina, finder, precio compartido)

**Files:**
- Create: `src/lib/tone.ts`, `src/lib/showcase.ts`, `src/lib/finder.ts`, `src/lib/pricing.ts`
- Modify: `src/components/shop/ProductCard.tsx`, para que use `cardPricing` (sin cambiar su salida)
- Test: `tests/lib/tone.test.ts`, `tests/lib/showcase.test.ts`, `tests/lib/finder.test.ts`, `tests/lib/pricing.test.ts`

**Interfaces:**
- Produces:
  - `type Tone = { key: "fresco" | "amaderado" | "dulce" | "especiado" | "natural" | "bronce"; light: string; dark: string }`
  - `toneFor(product: Pick<ProductDTO, "tags">): Tone`. La prioridad la da el orden de `tags` del producto: gana la primera etiqueta que tenga tono. Mapeos: `fresco|cítrico` → fresco, `amaderado` → amaderado, `dulce` → dulce, `especiado|intenso` → especiado, `natural` → natural; si no hay ninguna, bronce.
  - Valores de tono (color del brillo radial; el texto encima sigue siendo `text-fg`). Light es un pastel claro, dark un tono profundo:
    - fresco `#DCE6EE` / `#1F3A52`
    - amaderado `#E8DDD0` / `#3A2A1E`
    - dulce `#F1E3CC` / `#47331A`
    - especiado `#EED9CF` / `#4A2519`
    - natural `#E0E5D6` / `#28331F`
    - bronce `#EDE3D3` / `#33291E`
  - `pickShowcase(products: ProductDTO[], max = 5): ProductDTO[]`: los destacados activos, en orden; si no hay ninguno, los primeros `max` productos.
  - `wrapIndex(i: number, n: number): number`
  - `type FinderQuery = { moment?: "día" | "noche"; styles: string[] }`
  - `matchFragrances(products: ProductDTO[], q: FinderQuery): { exact: boolean; results: ProductDTO[] }`. Solo considera `category === "perfume"`.
  - `cardPricing(product: ProductDTO): { soldOut: boolean; label: string | null; orderHref: string; orderVariant: VariantDTO | null }`. Es la lógica actual de ProductCard extraída tal cual: el label es "₲ X" o "Desde ₲ X", y el href es el pedido o "Consultar".

- [ ] **Step 1: Tests**

```ts
expect(toneFor({ tags: ["cítrico", "amaderado"] }).key).toBe("fresco");
expect(toneFor({ tags: ["noche", "amaderado"] }).key).toBe("amaderado");
expect(toneFor({ tags: ["intenso"] }).key).toBe("especiado");
expect(toneFor({ tags: [] }).key).toBe("bronce");
expect(wrapIndex(-1, 4)).toBe(3); expect(wrapIndex(4, 4)).toBe(0); expect(wrapIndex(0, 0)).toBe(0);
expect(pickShowcase([a, featB, c, featD]).map(p => p.id)).toEqual([featB.id, featD.id]);
expect(pickShowcase([a, c], 1).map(p => p.id)).toEqual([a.id]);
// finder (perfumes: noche+amaderado, día+fresco, noche+dulce agotado, barba con tags noche)
expect(matchFragrances(all, { moment: "noche", styles: ["amaderado"] })).toEqual({ exact: true, results: [nocheAmaderado] });
expect(matchFragrances(all, { styles: [] }).results.every(p => p.featured)).toBe(true);           // sin selección → destacados (perfumes)
const partial = matchFragrances(all, { moment: "día", styles: ["dulce"] });
expect(partial.exact).toBe(false); expect(partial.results.length).toBeGreaterThan(0);            // nunca vacío si hay perfumes
expect(matchFragrances(all, { moment: "noche", styles: [] }).results.at(-1)).toBe(nocheDulceAgotado); // agotados al final
expect(matchFragrances(all, { moment: "noche", styles: [] }).results).not.toContain(barbaNoche);
```

  Las reglas de `matchFragrances`:
  - Puntaje = coincidencia de momento + cantidad de estilos que coinciden.
  - "Exacto" = el momento coincide (si se eligió) y coinciden todos los estilos elegidos.
  - Si hay exactos, se devuelven solo los exactos. Si no, todos los que tengan puntaje > 0, ordenados por puntaje descendente.
  - Los agotados (`isSoldOut`) van al final y el orden es estable.
  - Sin momento ni estilos: `exact: true` y los destacados (perfumes). Si no hay ninguno, todos los perfumes.
  - Si nada tiene puntaje: `exact: false` y todos los perfumes disponibles primero.

- [ ] **Step 2:** `npm test` → FAIL. Implementar → PASS. Pasar `ProductCard` a `cardPricing`: los tests de `tests/components/ProductCard.test.tsx` tienen que pasar **sin modificarse**.
- [ ] **Step 3:** `npm run lint` + commit `feat: lógica de tono, vitrina, buscador y precio compartido`.

---

### Task 2: Vitrina destacada

**Files:**
- Create: `src/components/shop/home/Showcase.tsx`
- Test: `tests/components/Showcase.test.tsx`

**Interfaces:**
- Consumes: `pickShowcase`, `wrapIndex`, `toneFor`, `cardPricing`, `SafeImage`, `Button`, `WhatsAppIcon`, `formatPYG`.
- Produces: `<Showcase products={ProductDTO[]} />` (client). Recibe la salida de `pickShowcase`. Con 0 productos no renderiza nada; con 1, no muestra controles.

- [ ] **Step 1: Tests**

```tsx
render(<Showcase products={[p1, p2, p3]} />);
const region = screen.getByRole("region", { name: /destacados/i });           // <section aria-roledescription="carrusel" aria-label="Destacados">
expect(within(region).getAllByRole("group")).toHaveLength(3);               // slides: role="group" aria-roledescription="diapositiva" aria-label="1 de 3"
expect(screen.getByRole("group", { name: "1 de 3" })).not.toHaveAttribute("inert");
expect(screen.getByRole("group", { name: "2 de 3" })).toHaveAttribute("inert");
await user.click(screen.getByRole("button", { name: "Siguiente" }));        // → slide 2 activa, barras con aria-current
expect(screen.getByRole("button", { name: "Ir al destacado 2" })).toHaveAttribute("aria-current", "true");
await user.keyboard("{ArrowLeft}");                                          // con foco en la región → vuelve a 1
// auto-avance: vi.useFakeTimers(); avanza 6000ms → slide 2; hover (mouseEnter en la región) → no avanza; botón "Pausar" → aria-pressed / label "Reanudar"
// reduced motion (matchMedia mock → reduce) → avanzar 12000ms no cambia la slide y el botón Pausar no se muestra
// producto agotado → enlace "Consultar disponibilidad" y no "Pedir ahora"; sin imágenes → placeholder role="img" name "Sin foto"
```

- [ ] **Step 2:** `npm test` → FAIL. Implementar:
  - **Pista:** contenedor `overflow-x-auto snap-x snap-mandatory` con diapositivas `snap-center w-full shrink-0`. Esconder la barra de scroll y conservar el swipe táctil.
  - **Índice:**
    - Se lleva en estado.
    - Cambiarlo hace `scrollTo` en la pista, con `behavior: "smooth"`, o `"auto"` si hay reduced motion.
    - Un `onScroll` con debounce sincroniza el índice cuando el usuario desliza con el dedo.
  - **Diapositiva:**
    - Grid de 2 columnas en desktop, apilado en móvil.
    - Fondo: brillo radial con `toneFor`, por CSS vars `--tone-light` y `--tone-dark` que cambian según el modo con `dark:`.
    - Imagen con `-rotate-3`, `rounded-2xl` y parallax ±24px con `useScroll`/`useTransform` de motion sobre la sección.
    - `h2` serif 32/56 px.
    - Hasta 2 chips de tags.
    - Una línea con la salida o la descripción (`line-clamp-2`).
    - Precio: `cardPricing`.
    - "Pedir ahora" (accent, WhatsApp, `target=_blank`) y "Ver producto" (secondary, a `/productos/[slug]`). Si está agotado: "Consultar disponibilidad".
  - **Alto:** `min-h-[70svh]` en móvil y `md:h-[520px]`.
  - **Controles:**
    - Flechas de 44 px "Anterior"/"Siguiente", visibles en `md`.
    - Barras de progreso: un botón por diapositiva, de 44 px de alto con la barra visible de 2 px adentro. La barra activa se llena con `scaleX` durante los 6 s; si está en pausa queda llena.
    - Botón Pausar/Reanudar.
  - **Auto-avance:**
    - Cada 6000 ms, con `setInterval`.
    - No avanza con hover, con foco dentro (`focusin`/`focusout`), con `document.hidden`, en pausa manual, ni con reduced motion (`matchMedia`).
  - **Inactivas:** `inert` y `aria-hidden` en las diapositivas no activas.
  - **Sin JS:** se ve la primera diapositiva y el resto con scroll-snap.
- [ ] **Step 3:** `npm test` → PASS, `npm run lint`, commit `feat: vitrina destacada con tono por estilo`.

---

### Task 3: Pestañas de categoría

**Files:**
- Create: `src/components/shop/home/CategoryTabs.tsx`
- Test: `tests/components/CategoryTabs.test.tsx`

**Interfaces:**
- Consumes: `groupByCategory` (`src/lib/home.ts`, se llama con `(products, 8)`), `ProductGrid`, `CATEGORIES`.
- Produces: `<CategoryTabs groups={CategoryGroup[]} />` (client). Una pestaña por grupo; los grupos vacíos ya vienen omitidos.

- [ ] **Step 1: Tests**

```tsx
render(<CategoryTabs groups={[perfumes, barba, cabello]} />);
const tabs = screen.getAllByRole("tab");
expect(tabs.map(t => t.textContent)).toEqual(["Perfumes", "Barba", "Cabello"]);
expect(tabs[0]).toHaveAttribute("aria-selected", "true");
expect(screen.getByRole("tabpanel", { name: "Perfumes" })).toBeVisible();
expect(screen.getByRole("tabpanel", { name: "Barba", hidden: true })).not.toBeVisible();   // hidden attr
tabs[0].focus(); await user.keyboard("{ArrowRight}");                                         // foco + selección → Barba
expect(screen.getByRole("tab", { name: "Barba" })).toHaveFocus();
expect(screen.getByRole("tab", { name: "Barba" })).toHaveAttribute("aria-selected", "true");
await user.keyboard("{End}"); expect(screen.getByRole("tab", { name: "Cabello" })).toHaveAttribute("aria-selected", "true");
expect(screen.getByRole("link", { name: /ver todos \(5\)/i })).toHaveAttribute("href", "/productos?categoria=cabello");
render(<CategoryTabs groups={[barba]} />) // una sola → igual funciona (tab única seleccionada)
```

- [ ] **Step 2:** `npm test` → FAIL. Implementar con el patrón WAI-ARIA de pestañas:
  - Roving `tabIndex`; ←/→ con vuelta al principio/final, Home y End.
  - Activación automática.
  - Los paneles van con `role="tabpanel"`, `aria-labelledby` y `tabIndex={0}`.
  - Se renderizan todos los paneles y los inactivos llevan `hidden`, así funciona sin JS.
  - **Indicador:** `motion.span layoutId="tab-indicator"`, de 2 px, bronce, debajo de la pestaña activa, con 250 ms ease-out.
  - **Panel activo:** `AnimatePresence mode="wait"`, opacity 0→1 y y 8→0 en 250 ms, con cascada de tarjetas de 40 ms (`staggerChildren`).
  - **Encabezado:** a la izquierda el título "Explorá la tienda" (h2 serif) y a la derecha "Ver todos (N)" de la pestaña activa.
  - Las pestañas tienen 44 px o más y scroll horizontal en móvil si no entran.
- [ ] **Step 3:** `npm test` → PASS, `npm run lint`, commit `feat: pestañas de categoría animadas`.

---

### Task 4: Encontrá tu fragancia + página + limpieza

**Files:**
- Create: `src/components/shop/home/FragranceFinder.tsx`
- Modify: `src/app/(shop)/page.tsx`
- Delete: `src/components/shop/StoreIntro.tsx` y `CategorySection.tsx` si quedan sin uso. Grep antes.
- Test: `tests/components/FragranceFinder.test.tsx`

**Interfaces:**
- Consumes: `matchFragrances`, `ProductCard`, `Reveal`, `pickShowcase`, `Showcase`, `CategoryTabs`, `groupByCategory`, `listProducts`.
- Produces: `<FragranceFinder perfumes={ProductDTO[]} />` (client).

- [ ] **Step 1: Tests**

```tsx
render(<FragranceFinder perfumes={all} />);
expect(screen.getByRole("heading", { name: "Encontrá tu fragancia" })).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "Noche" }));
expect(screen.getByRole("button", { name: "Noche" })).toHaveAttribute("aria-pressed", "true");
await user.click(screen.getByRole("button", { name: "Amaderado" }));
expect(screen.getByRole("status")).toHaveTextContent("1 perfume para vos");
await user.click(screen.getByRole("button", { name: "Noche" }));                       // toggle off
await user.click(screen.getByRole("button", { name: "Día" })); await user.click(screen.getByRole("button", { name: "Dulce" }));
expect(screen.getByText("No hay uno exacto; estos se acercan.")).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "Limpiar" }));
expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(0);
```

- [ ] **Step 2:** `npm test` → FAIL. Implementar:
  - Dos `fieldset`/`legend` ("¿Para cuándo?" y "¿Qué estilo?").
  - **Chips:** `button aria-pressed` de 44 px. Momento es selección única que se puede desmarcar; estilos es selección múltiple.
  - **Opciones de estilo:** Fresco, Amaderado, Dulce, Especiado, Intenso, Suave. Se mapean a las tags en minúscula.
  - **Contador** `role="status"`: "N perfume(s) para vos". Cuando no es exacto, el aviso "No hay uno exacto; estos se acercan.".
  - **Riel:**
    - `ul` con `overflow-x-auto snap-x`.
    - Ítems `w-[180px] md:w-[220px] shrink-0 snap-start`, cada uno con un `ProductCard`.
    - Flechas "Anterior"/"Siguiente" visibles en `md`, que hacen `scrollBy`.
    - El cambio de resultados se anima con fade de 200 ms.
  - "Limpiar" queda visible solo si hay selección.
  - Usa solo perfumes; se le pasa `products.filter(p => p.category === "perfume")`.
- [ ] **Step 3:** `page.tsx`, en este orden:
  - `<h1 className="sr-only">El Barbudo — perfumes y cuidado para el hombre</h1>`
  - `<Showcase products={pickShowcase(products)} />` sin `Reveal`
  - `<Reveal><CategoryTabs groups={groupByCategory(products, 8)} /></Reveal>`
  - `<Reveal><FragranceFinder perfumes={…} /></Reveal>`
  - La fila de barbería actual.

  Reglas:
  - Si no hay productos, se mantiene el estado vacío actual.
  - La vitrina va a ancho completo con márgenes de 16 px en móvil (`max-w-6xl` como contenedor).
  - Borrar los componentes que queden sin uso y actualizar `tests/lib/home.test.ts` solo si hace falta (la función no cambia).
- [ ] **Step 4:** Verificar en el navegador del controlador:
  - a 375 px y 1280 px, en claro y oscuro: swipe, flechas, teclado y pausa en la vitrina; pestañas; finder;
  - sin scroll horizontal de página (`document.documentElement.scrollWidth === innerWidth`);
  - producto visible en el primer pantallazo del móvil.
  - Curl `/`: el h1, la primera diapositiva, el panel de Perfumes y los "Ver todos".
  - `npm test`, `npm run lint` y `npm run build`.
- [ ] **Step 5:** Commit `feat: portada dinámica con vitrina, pestañas y buscador de fragancia`.
