# El Barbudo

Tienda web de una barbería y perfumería en Asunción, Paraguay. La portada es la tienda: catálogo con filtros, ficha de producto y un carrito que arma el pedido y lo envía por WhatsApp (no hay pasarela de pago). Incluye una página de la barbería (`/barberia`) y un panel de administración protegido por contraseña para editar productos, stock, precios y servicios.

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Prisma 7 con SQLite en local · Vitest.

## Requisitos

- Node.js 20.9 o superior y npm.
- Un compilador de C/C++ disponible solo si `better-sqlite3` no trae binario para tu sistema (ver "Avisos de npm").

## Puesta en marcha local

```bash
cp .env.example .env        # y completa los valores (ver abajo)
npm install                 # el postinstall corre `prisma generate`
npx prisma migrate dev      # crea dev.db y aplica las migraciones
npx prisma db seed          # carga productos y servicios de prueba
npm run dev                 # http://localhost:3000
npm test                    # pruebas (Vitest)
```

Otros comandos: `npm run lint`, `npm run build`, `npm start`.

### Variables de entorno

Documentadas en `.env.example`:

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Conexión a la base. En local: `file:./dev.db`. |
| `ADMIN_PASSWORD` | Contraseña única del panel `/admin`. |
| `SESSION_SECRET` | Secreto que sella la cookie de sesión. Mínimo 32 caracteres. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número del local, solo dígitos con código de país (ej. `595981123456`). |

Con `NODE_ENV=production` la aplicación rechaza los valores de ejemplo de `.env.example`: con el `SESSION_SECRET` de ejemplo el admin falla con un error claro, y con la `ADMIN_PASSWORD` de ejemplo nadie puede entrar (el log avisa, sin escribir el valor). `DATABASE_URL` es obligatoria fuera de desarrollo y pruebas, tanto en la app como en `prisma.config.ts`.

Para generar un secreto: `openssl rand -base64 48`.

### El seed borra todo

`npx prisma db seed` **borra todos los productos, variantes y servicios** antes de recrearlos. Es solo para desarrollo y demos. No lo corras nunca contra una base con datos reales (ni en producción una vez que el local cargó sus productos).

## Antes de publicar: datos de ejemplo a reemplazar

- **Datos del local** en `src/site.ts`: dirección, horarios, Instagram, número de WhatsApp de respaldo y los textos de "Sobre El Barbudo" son datos de ejemplo.
- **Fotos de productos**: las del seed son marcadores de posición. Reemplazalas desde el admin (`/admin`, editar producto) pegando las URLs `https://` de las fotos reales, una por línea. Algunos productos no tienen foto y muestran un marcador neutro.
- **Logo**: `public/logo.jpg` es un JPG de 150 px, así que se ve algo suave al ampliarlo. Pedir a la marca el logo en SVG y reemplazar el archivo (el componente `src/components/ui/Logo.tsx` lo usa en un solo lugar).

## Seguridad del admin

- La sesión es una **cookie sellada sin estado** (iron-session, 7 días): no hay sesiones en la base. Para **cerrar todas las sesiones** (por ejemplo si se filtró la contraseña) cambia `SESSION_SECRET` y vuelve a desplegar: todas las cookies existentes dejan de ser válidas.
- **No hay límite de intentos de inicio de sesión.** Usa una contraseña larga y única (una frase de 4 o más palabras o un valor generado) y no la reutilices.
- Cada página y cada acción del panel comprueban la sesión por su cuenta; no dependen solo del layout.

## Desplegar en Vercel con Neon (Postgres)

En local se usa SQLite. En producción necesitas una base persistente: Vercel no guarda archivos entre ejecuciones, así que `dev.db` no sirve allí. Esta guía usa Postgres en Neon.

1. **Crea la base en Neon** y copia la cadena de conexión (`postgresql://...`).
2. **Cambia el motor en un solo lugar** (el cliente y el esquema):
   - `src/lib/prisma-client.ts`: reemplaza el adapter de SQLite por el de Postgres.
     ```bash
     npm uninstall @prisma/adapter-better-sqlite3 better-sqlite3
     npm install @prisma/adapter-pg
     ```
     ```ts
     import { PrismaPg } from "@prisma/adapter-pg";
     // ...
     return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
     ```
     Ajusta también el valor por defecto de desarrollo (`DEV_DATABASE_URL`) o define `DATABASE_URL` siempre.
   - `prisma/schema.prisma`: `datasource db { provider = "postgresql" }`.
   - `prisma.config.ts`, el seed y el resto de la app usan esa misma fábrica o `DATABASE_URL`; no hay más lugares que tocar.
3. **Regenera las migraciones.** Las de `prisma/migrations` son específicas de SQLite: borra esa carpeta y crea la inicial contra Postgres:
   ```bash
   rm -rf prisma/migrations
   DATABASE_URL="postgresql://..." npx prisma migrate dev --name init
   ```
4. **Carga el contenido real** desde el admin. Si quieres datos de prueba en una base de staging, `npx prisma db seed` los crea, pero recuerda que borra todo (ver arriba).
5. **Variables de entorno en Vercel** (Project Settings → Environment Variables), las 4, con valores fuertes y propios, distintos de los de `.env.example`:
   `DATABASE_URL` (la de Neon), `ADMIN_PASSWORD`, `SESSION_SECRET` (32 o más caracteres) y `NEXT_PUBLIC_WHATSAPP_NUMBER`.
6. **Build**: el comando por defecto de Vercel (`next build`) alcanza. El script `postinstall` ya corre `prisma generate` al instalar dependencias. Las migraciones nuevas se aplican con `npx prisma migrate deploy` contra la base de producción (desde tu equipo con `DATABASE_URL` apuntando a Neon, o anteponiéndolo al comando de build: `prisma migrate deploy && next build`).

## Avisos de npm

Con npm 11 aparece un aviso `install-scripts` porque algunos paquetes ejecutan scripts al instalarse y todavía no están aprobados en `allowScripts`: `better-sqlite3` (compila o descarga su binario), `prisma` y `@prisma/engines`, y `esbuild` (y también `fsevents` y `unrs-resolver`, opcionales). Hoy solo avisa y los scripts se ejecutan; en una versión futura de npm podrían bloquearse y la app no arrancaría sin `better-sqlite3` ni el cliente de Prisma. Para revisarlos o aprobarlos: `npm install-scripts ls` y `npm install-scripts approve <paquete>`. Tras migrar a Postgres, `better-sqlite3` deja de ser necesario.

## Nota sobre `next build --webpack`

Turbopack es el bundler por defecto de Next 16 y `npm run build` funciona normalmente. `next build --webpack` falla únicamente en la carpeta local actual, por el apóstrofo del nombre de la ruta (`Ivandev's Projects`). No afecta a Vercel ni a ninguna ruta sin apóstrofos.

## Estructura

```
prisma/            esquema, migraciones y seed
src/site.ts        datos del local (nombre, dirección, horarios, redes, "Sobre")
src/lib/           dinero, WhatsApp, stock, productos, auth, cliente Prisma
src/stores/        carrito (Zustand, persistido en localStorage)
src/components/    ui/, shop/ y admin/
src/app/(shop)/    tienda: portada, /productos, /productos/[slug], /barberia, 404
src/app/admin/     login, productos y servicios
tests/             Vitest, espejo de src/
```
