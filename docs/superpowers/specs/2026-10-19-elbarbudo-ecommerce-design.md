# El Barbudo — Diseño del e-commerce (MVP)

> Documento de diseño surgido del brainstorming del 2026-10-19. Al aprobarse, se guarda tal cual en `docs/superpowers/specs/2026-10-19-elbarbudo-ecommerce-design.md` y el siguiente paso es el plan de implementación (skill `writing-plans`).

## Contexto

El Barbudo es una barbería y tienda de productos personales para el hombre (perfumes, barba, cabello) en Paraguay. La marca pide una web tipo e-commerce para ofrecer sus productos. No hay pasarela de pago: el pedido se cierra por WhatsApp. La web tiene que vender la marca y el producto a la vez, funcionar primero en celular, y darle al dueño una forma simple de mantener stock y precios.

Hoy no existe nada: la carpeta del proyecto solo tiene `logo.jpg` (barba negra con ojos cerrados sobre fondo blanco, "EL BARBUDO" en serif de alto contraste) y los skills instalados.

## Intención

Una tienda online que se sienta como la marca: minimalista, con carácter, moderna. Que alguien que vio un perfume en el mostrador lo encuentre y lo pida en menos de un minuto desde el celular, y que alguien que nunca escuchó de El Barbudo entienda en el primer scroll qué es y por qué comprarle.

## Para quién

Tres perfiles, todos en móvil principalmente:

1. **Cliente de la barbería.** Conoce el local, vio algo en el mostrador, entra desde Instagram o WhatsApp. Quiere encontrarlo rápido y pedirlo.
2. **Alguien nuevo.** Llega por redes o Google. La marca tiene que hablarle antes que el producto.
3. **Quien busca un regalo para un hombre.** No sabe de perfumes. Necesita orientación: etiquetas claras, precios visibles, cómo pedir sin complicarse.

## Objetivos, no-objetivos, anti-objetivos

**Objetivos**
- Catálogo claro y navegable por categoría (Perfumes, Barba, Cabello).
- Pedido por WhatsApp en dos caminos: botón directo en cada producto, y carrito con un único mensaje.
- Modo claro y oscuro, según preferencia del sistema, con toggle.
- Panel de admin con contraseña única para editar stock, precio, marcar agotado, y crear/editar productos.
- Presentar la marca: sección "Sobre la barbería" y lista de servicios de barbería con precios.
- Admin edita también la lista de servicios (nombre, descripción, precio, orden).
- Desplegable en Vercel con un único paso documentado (cambio de proveedor de base de datos; ver "Cómo se hace").

**No-objetivos (MVP)**
- Pagos online, checkout, cuentas de cliente.
- Registro de pedidos en el admin (los pedidos viven en WhatsApp).
- Reserva de turnos online (el botón de turno abre WhatsApp).
- Gestión de portada/destacados desde el admin (se marca `destacado` por producto; con eso alcanza).
- Edición desde el admin de dirección, horarios, Instagram y el texto de "Sobre la barbería": van fijos en código (un archivo `site.ts` de configuración), cambian rara vez.
- Subida de archivos de imagen. Las fotos se cargan por URL.
- Descuento automático de stock. Los pedidos viven en WhatsApp; el dueño descuenta a mano en el admin.
- Multi-idioma. Todo en español de Paraguay.

**Anti-objetivos (lo que la haría fallar aunque funcione)**
- Que parezca una plantilla genérica de e-commerce: gradientes morados, tarjetas sobre tarjetas, íconos decorativos en cada título.
- Animaciones que estorben: el movimiento tiene que ayudar a entender, no impresionar.
- Que en celular el botón de pedir quede fuera del alcance del pulgar o tape contenido.
- Texto gris sobre gris "minimalista" que no se lee.

## Dirección visual (decidido con mockups)

**Estilo:** moderno minimalista, línea Aesop / Le Labo. Mucho aire, fotos grandes, tipografía serif para títulos.

**Paleta** (acento elegido: **bronce**):

| Rol | Claro | Oscuro |
|---|---|---|
| Fondo | `#F7F5F0` (papel) | `#121212` (carbón) |
| Superficie / tarjeta | `#FFFFFF` | `#1C1C1C` |
| Texto principal | `#141414` | `#F2EFE9` |
| Texto secundario | `#6B6762` | `#A39E95` |
| Borde | `#E6E2DA` | `#2E2C29` |
| Acento bronce | `#9A7B4F` | `#C9A66B` |
| WhatsApp (solo en el botón de enviar pedido) | `#25D366` | `#25D366` |
| "En stock" | verde apagado (`#3F6B52` claro / `#7FA68F` oscuro) | |

Contraste mínimo 4.5:1 en texto; el bronce se usa en botones con texto oscuro encima, nunca como color de texto chico sobre fondo claro.

**Tipografía:** serif de alto contraste para títulos y el wordmark (Cormorant Garamond o Playfair Display; el builder elige la que mejor case con el logo), sans limpia para todo lo demás (Inter o Geist). Body ≥ 16px, line-height 1.5.

**Modo por defecto:** según el sistema (`prefers-color-scheme`), con toggle sol/luna en el header que persiste la elección.

**Movimiento:** reveals al scroll (fade + leve subida, 200–300 ms), transiciones de página suaves, hover con peso en tarjetas (elevación sutil, imagen con zoom leve), drawer del carrito deslizando desde el lado. Respeta `prefers-reduced-motion`. Nada que supere 500 ms.

**Logo:** se usa el `logo.jpg` existente; el builder genera una versión SVG o PNG con fondo transparente del ícono de barba y el wordmark para que funcione en ambos modos (invertido en oscuro).

## Pantallas (decidido con mockups)

### Portada
- Header fijo y fino: ícono + "EL BARBUDO" en serif con tracking, toggle de tema, ícono de bolsa con contador.
- **Hero a foto completa**: foto de producto o del local ocupando la primera pantalla, velo oscuro suave, encima una línea pequeña con tracking ("PERFUMERÍA · BARBA · CABELLO"), titular corto en serif grande ("Lo esencial, bien hecho." es placeholder; el builder puede proponer), botón primario "Ver catálogo" y botón secundario de WhatsApp.
- Tres accesos de categoría (Perfumes, Barba, Cabello) con ícono y nombre.
- "Destacados": grilla de tarjetas de producto (2 columnas en móvil, 3–4 en desktop).
- Bloque "Sobre la barbería": texto breve + foto del local.
- Bloque "Servicios": lista de cortes/afeitados con precio y botón "Reservar por WhatsApp".
- Footer: dirección, horarios, Instagram, WhatsApp.

### Catálogo (`/productos`, `/productos?categoria=perfumes`)
- Filtro por categoría (chips) y por etiqueta (amaderado, fresco, noche, etc.).
- Mismas tarjetas que en Destacados.
- Estados: vacío ("No hay productos en esta categoría todavía"), cargando (skeletons), agotado (tarjeta atenuada con etiqueta "Agotado"; el botón pasa a "Consultar" y abre WhatsApp con "Hola El Barbudo, ¿tienen disponible [producto]?").

**Reglas de stock (mi call):** el stock vive en la variante y solo cambia desde el admin. Un producto está "Agotado" cuando todas sus variantes están en 0. El selector de cantidad y el carrito no dejan superar el stock disponible de la variante. "En stock" no muestra la cantidad exacta.

### Tarjeta de producto
- Foto, nombre, subtítulo (tipo y tamaño), precio en guaraníes (`₲ 285.000`), botón redondo de WhatsApp en bronce. Click en la tarjeta → ficha.

### Ficha de producto (`/productos/[slug]`)
- Foto grande (galería si hay más de una), categoría arriba, nombre en serif, precio, indicador "En stock" / "Agotado".
- Descripción corta.
- **Notas olfativas** (salida / corazón / fondo) para perfumes; para barba/cabello, ingredientes o beneficios.
- **Etiquetas** (chips) para orientar y filtrar.
- **Variantes de tamaño** (ej. 50 ml / 100 ml) con precio distinto; selector antes del botón.
- Selector de cantidad.
- Botón primario bronce "Pedir ahora" (abre WhatsApp con ese producto), botón secundario "Agregar al carrito".
- **Relacionados**: "También te puede gustar" (misma categoría o etiqueta compartida).
- En móvil, la barra con precio + "Pedir ahora" queda fija abajo (zona del pulgar).

### Carrito (drawer lateral, no página)
- Lista de ítems con cantidad editable y eliminar.
- Total estimado.
- Aviso: "Confirmamos stock, entrega y pago por WhatsApp."
- Vista previa del mensaje que se enviará.
- Botón verde WhatsApp "Enviar pedido por WhatsApp".
- Persiste en `localStorage`.

### Mensaje de WhatsApp
Formato (se abre vía `https://wa.me/595XXXXXXXXX?text=...`, número en variable de entorno):

```
Hola El Barbudo 👋 Quiero pedir:
• 1 × Noir Intense (100 ml) — ₲ 285.000
• 2 × Aceite de barba — ₲ 190.000
Total: ₲ 475.000
```

Para el botón directo de un producto, el mismo formato con un solo ítem. Para "Reservar turno", mensaje distinto: "Hola El Barbudo, quiero reservar un turno para [servicio]".

### Admin (`/admin`)
- Login con contraseña única (`ADMIN_PASSWORD` en entorno); sesión en cookie firmada.
- Tabla de productos: foto miniatura, nombre, categoría, precio, stock, destacado, activo. Edición rápida de precio y stock en línea; marcar agotado = stock 0.
- Formulario crear/editar producto: nombre, slug (auto), categoría, descripción, notas, etiquetas, variantes (tamaño + precio + stock), fotos (URL en el MVP; subida de archivos queda fuera), destacado, activo.
- Tabla de servicios: nombre, descripción, precio, orden; crear/editar/eliminar.
- Estilo sobrio, mismo sistema de diseño, siempre sans. Es una herramienta, no una vitrina.

## Datos

**Modelo:**
- `Product`: id, slug, name, category (`perfume | barba | cabello`), description, notes (`{top, heart, base}` opcional), tags[], images[], featured, active, createdAt.
- `Variant`: id, productId, label ("100 ml"), price (entero en guaraníes), stock.
- `Service`: id, name, description, price, order (para la sección de barbería).

Un producto sin tamaños tiene una sola variante. El stock vive en la variante.

`tags` e `images` se guardan como JSON serializado (SQLite no tiene arrays nativos; así el modelo no cambia al pasar a Postgres).

**Datos de prueba:** ~12 productos reales de internet (perfumes conocidos de nicho/diseñador con sus notas reales, aceites y bálsamos de barba, ceras y champús), fotos de Unsplash, precios plausibles en guaraníes. ~6 servicios de barbería. Un `seed` reproducible. El seed es solo para desarrollo y demo; el catálogo real se carga después desde el admin.

## Cómo se hace (decisiones técnicas)

Elegidas por mí; el usuario pidió Next.js + React + Tailwind y Vercel, el resto son mis calls:

- **Next.js 16 (App Router; la versión estable actual) + React + TypeScript + Tailwind CSS v4.**
- **Framer Motion** para animaciones.
- **next-themes** para modo claro/oscuro.
- **Prisma** como ORM con **SQLite** en el MVP (cero instalación local). Para Vercel el stock necesita persistir, así que el despliegue tiene un paso conocido: cambiar `provider` a `postgresql` en `schema.prisma`, apuntar `DATABASE_URL` a Neon, correr la migración y el seed. Se documenta en el README. El modelo evita rasgos exclusivos de un motor para que ese cambio sea solo el proveedor.
- **Server Actions** para las mutaciones del admin; sin API REST aparte.
- Auth del admin: comparación de contraseña + cookie firmada con `iron-session` (o equivalente ligero). Sin NextAuth.
- Carrito en estado cliente (`zustand` o Context) + `localStorage`.
- Formato de moneda con `Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' })`.
- Imágenes con `next/image`; `remotePatterns` permite cualquier host `https` para que el dueño pueda pegar URLs de donde sea.
- Datos del local (nombre, dirección, horarios, Instagram, número de WhatsApp, texto "Sobre la barbería") en un archivo de configuración `site.ts`; el número de WhatsApp además en variable de entorno.
- Semántica primero: `<button>`, `<dialog>` para el drawer, labels sobre campos, foco visible, targets ≥ 44 px en móvil.

## Lo que queda al builder

- Elección final entre Cormorant Garamond y Playfair Display.
- Titular del hero y microcopy de secciones (en español rioplatense neutro, sin "por favor", sin signos de exclamación en sistema).
- Estructura exacta de componentes y carpetas.
- Qué foto de Unsplash va en cada producto y en el hero.
- Diseño del formulario de producto en el admin (siguiendo las reglas de formularios del skill ux-designer: labels arriba, validación en blur, errores junto al campo).
- Cómo generar el logo transparente a partir de `logo.jpg`.

## Verificación (cuando esté construido)

1. `npm run dev`, abrir en el navegador integrado a 375 px y en desktop; revisar modo claro y oscuro.
2. Recorrer: portada → categoría → ficha → "Pedir ahora" abre `wa.me` con el mensaje correcto; agregar dos productos al carrito → "Enviar pedido" abre `wa.me` con el resumen.
3. `/admin`: entrar con la contraseña, cambiar stock de un producto a 0, verificar que en la tienda aparece "Agotado"; crear un producto nuevo y verlo en su categoría.
4. Navegación por teclado completa en la tienda; foco visible; Lighthouse accesibilidad ≥ 90.
5. `npm run build` sin errores; `prisma migrate` y `seed` funcionan desde cero.
