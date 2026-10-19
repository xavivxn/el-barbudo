# Portada dinámica de El Barbudo: vitrina, pestañas y "Encontrá tu fragancia"

## Context

Al cliente no le gusta la portada actual. Hoy es una tienda resumida: una banda de texto, chips, "Destacados" y una sección por categoría, todas como grillas estáticas. La quiere mucho más dinámica e interactiva, profesional en UI/UX y atractiva tanto en desktop como en móvil.

La regla de la Task 14 sigue en pie: la portada vende productos, no cuenta qué hace la barbería.

Del mockup que se mostró, el cliente eligió:

- **A · Vitrina destacada.**
- **C · Pestañas de categoría.**
- **B · Encontrá tu fragancia.**

Movimiento: **"notorio pero elegante"**, con transiciones de 200–400 ms y un parallax leve. Además pidió **instalar y usar la skill UI/UX Pro Max** (`uipro init --ai claude`) junto a `ux-designer`.

Fuera de alcance, porque no se eligieron: tarjetas con hover de notas o agregado rápido, y la franja de confianza en movimiento. El resto de la tienda y el admin no se tocan.

## Orden de la portada nueva

1. **h1 accesible.** Visualmente oculto: "El Barbudo — perfumes y cuidado para el hombre". Reemplaza la banda `StoreIntro`.
2. **A · Vitrina destacada.** Ocupa el primer pantallazo: ~70svh en móvil y 520px en desktop.
3. **C · Pestañas** Perfumes / Barba / Cabello, con la grilla animada.
4. **B · Encontrá tu fragancia.**
5. **Fila de la barbería.** Es la actual: "¿Corte o barba?" → `/barberia`.

## Diseño de cada pieza

### A · Vitrina destacada (`src/components/shop/home/Showcase.tsx`, client)

**Datos y contenido**
- Usa los productos con `featured`. Si no hay destacados, usa los primeros 4 productos.
- Cada diapositiva tiene:
  - foto grande, con un leve giro y parallax al scrollear: la imagen se mueve unos 24px con `useScroll` de motion;
  - nombre en serif (h2);
  - 2 chips de etiquetas;
  - una línea con la nota de salida o la descripción corta;
  - el precio con la regla R10, `priceLabel` de ProductCard;
  - "Pedir ahora" (WhatsApp, bronce) y "Ver producto".
- Fondo: un gradiente radial con el **tono del estilo** del producto, sacado de `toneFor(product)` en `src/lib/tone.ts`:
  - fresco/cítrico → azul pizarra
  - amaderado → nogal
  - dulce → ámbar
  - especiado → óxido
  - natural → oliva
  - sin etiqueta conocida → bronce
  - Cada tono tiene par claro/oscuro, para que el texto mantenga ≥4.5:1 en los dos modos.

**Mecánica**
- La base es **scroll-snap horizontal nativo**: funciona sin JS y el swipe en móvil es natural.
- Con JS se suman:
  - flechas (desktop);
  - teclado ←/→;
  - barras de progreso clicables (`aria-current` en la activa);
  - auto-avance cada 6 s.
- El auto-avance se pausa con hover, con foco dentro y con la pestaña oculta. Se desactiva con `prefers-reduced-motion`.
- Botón visible **Pausar/Reanudar** (WCAG 2.2.2).

**Accesibilidad**
- Patrón de carrusel WAI-ARIA: `section aria-roledescription="carrusel"` y diapositivas con `aria-roledescription="diapositiva"` y `aria-label="1 de 4"`.
- Lo que está fuera de vista lleva `inert`.

**Lógica pura** en `src/lib/showcase.ts`:
- `pickShowcase(products, max = 5)`
- `wrapIndex(i, n)`

### C · Pestañas de categoría (`src/components/shop/home/CategoryTabs.tsx`, client)

- Patrón WAI-ARIA tabs:
  - `role="tablist"`, `tab` con `aria-selected` y `aria-controls`;
  - flechas, Home y End;
  - activación automática.
- El **indicador bronce se desliza** entre pestañas con `layoutId` de motion.
- La grilla cambia con `AnimatePresence`: fade + 8px, 250 ms, con una pequeña cascada por tarjeta (≤ 40 ms c/u).
- Reusa `ProductGrid` y `ProductCard` sin cambios.
- "Ver todos (N)" va a `/productos?categoria=<slug>`.
- **Sin JS:** el servidor renderiza los 3 paneles. Los inactivos llevan `hidden`, así que se ve Perfumes y quedan los enlaces "Ver todos" de cada categoría.
- Datos: `groupByCategory(products, 8)` de `src/lib/home.ts`, que ya existe. Ahora sin `exclude`, porque la vitrina es otro formato.

### B · Encontrá tu fragancia (`src/components/shop/home/FragranceFinder.tsx`, client)

- Dos preguntas con chips seleccionables. Son `button` con `aria-pressed`, de 44 px o más.
  - **¿Para cuándo?:** Día / Noche.
  - **¿Qué estilo?:** Fresco, Amaderado, Dulce, Especiado, Intenso, Suave. Sale del vocabulario real de etiquetas del seed.
- Los resultados se actualizan al instante en un **riel horizontal con snap** de `ProductCard` de ancho fijo.
  - En móvil se desliza con el dedo; en desktop lleva flechas.
  - Arriba de los resultados, el contador "N perfumes para vos" en `aria-live="polite"`.
- Coincidencia: es pura en `src/lib/finder.ts`, `matchFragrances(perfumes, { moment?, styles[] })`.
  - Ordena por cantidad de coincidencias y deja los agotados al final.
  - Sin selección muestra los destacados.
  - Sin coincidencias exactas muestra "No hay uno exacto; estos se acercan" con las coincidencias parciales.
- "Limpiar" reinicia la selección.
- Usa solo productos de categoría `perfume`.

### Sistema y movimiento

- Paleta, tipografías y tokens de marca **sin cambios** (`global-constraints`): papel/carbón, bronce, Cormorant + Inter.
- Las recomendaciones de UI/UX Pro Max se aplican a patrones, jerarquía, espaciado y motion. Si sugieren otra paleta o tipografía, manda la marca.
- Todo el movimiento:
  - va con `motion/react` y el `MotionProvider` que ya existe (`reducedMotion="user"`) más la regla CSS global de reduced motion;
  - usa solo `transform` y `opacity`.
- Lo que está sobre el pliegue (la vitrina) es visible sin JS: no usa `Reveal`. C y B pueden usar `Reveal`, que ya tiene el `<noscript>` (`data-reveal`).

## Archivos

**Nuevos**
- `src/components/shop/home/Showcase.tsx`
- `src/components/shop/home/CategoryTabs.tsx`
- `src/components/shop/home/FragranceFinder.tsx`
- `src/lib/tone.ts`
- `src/lib/showcase.ts`
- `src/lib/finder.ts`
- Tests:
  - `tests/lib/tone.test.ts`, `showcase.test.ts`, `finder.test.ts`
  - `tests/components/Showcase.test.tsx`, `CategoryTabs.test.tsx`, `FragranceFinder.test.tsx`

**Modificados**
- `src/app/(shop)/page.tsx`: nuevo orden.
- `src/app/globals.css`: variables de tono, si hacen falta.
- `tests/lib/home.test.ts`: si cambia el uso de `exclude`, la función sigue igual.

**Se borran si quedan sin uso**
- `src/components/shop/StoreIntro.tsx`
- `src/components/shop/CategorySection.tsx`

**Se reusan**
- `ProductGrid` y `ProductCard`, junto con `priceLabel` y la regla R10.
- `formatPYG` (`src/lib/money.ts`).
- `whatsappUrl` y `buildOrderMessage` (`src/lib/whatsapp.ts`).
- `isSoldOut` y `minPrice` (`src/lib/stock.ts`).
- `groupByCategory` (`src/lib/home.ts`).
- `listProducts` (`src/lib/products.ts`).
- `CATEGORIES` (`src/lib/types.ts`).
- `Button`, `Chip`, `SafeImage`, `WhatsAppIcon`, `Reveal` y `ChipRow`.

## Aporte de UI/UX Pro Max (consultada el 2026-10-19)

- Design system sugerido para "luxury men grooming perfume e-commerce": coincide con la marca (Cormorant + base oscura + acento dorado). **Se adopta:** acento metálico solo en CTAs, mucho aire y tipografía grande.
- **No se adopta:** el estilo "Liquid Glass" (backdrop-blur, efectos iridiscentes). La skill misma lo marca con contraste y rendimiento en riesgo, y además choca con las reglas de ux-designer (nada de glassmorphism por defecto). Montserrat tampoco: la marca usa Inter.
- **Patrón "Horizontal Scroll Journey":** tonos por capítulo que transicionan de forma continua y barra de progreso visible. Encaja con la vitrina: el tono cambia por producto, con barras de progreso y la navegación siempre visible.
- **Animación:** ease-out al entrar y ease-in al salir. Nada de animaciones infinitas decorativas (la vitrina avanza por intervalos y se pausa, no gira sin fin). Respetar `prefers-reduced-motion`. Duraciones de micro-interacción entre 150 y 300 ms.
- **Checklist pre-entrega:** cursor-pointer en todo lo clickeable, hover sin saltos de layout, foco visible, contraste ≥ 4.5:1 en claro y en oscuro, y prueba a 375, 768, 1024 y 1440 px.

## Verificación

- `npm test`, `npm run lint` y `npm run build` sin errores.
- Navegador a 375 px y 1280 px, en claro y en oscuro: swipe, flechas y teclado en la vitrina; pausa por hover y foco; botón "Pausar". Pestañas con indicador y teclado. El finder filtra y anuncia. Sin scroll horizontal y con producto visible en el primer pantallazo del celular.
- Sin JS: primera diapositiva, panel de Perfumes y enlaces "Ver todos".
- axe sin violaciones serias; contraste ≥ 4.5:1 sobre cada tono, en ambos modos.
