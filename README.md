# El Barbudo

Tienda web de una barbería y perfumería en Asunción, Paraguay. La portada es la tienda: catálogo con filtros, ficha de producto y un carrito que arma el pedido y lo envía por WhatsApp (no hay pasarela de pago). Incluye una página de la barbería (`/barberia`) y un panel de administración protegido por contraseña para editar productos, stock, precios y servicios.

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Prisma 7 con SQLite en local · Vitest.

## Requisitos

- Node.js `^20.19.0 || ^22.12.0 || >=24.0.0` (recomendado: 22 LTS o más nuevo) y npm. Es el rango que exige Prisma 7; `package.json` lo declara igual en `engines`.
- Un compilador de C/C++ disponible solo si `better-sqlite3` no trae binario para tu sistema (ver "Avisos de npm").

## Puesta en marcha local

```bash
cp .env.example .env        # y completá los valores (ver abajo)
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
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número del local, solo dígitos con código de país (ej. `5959XXXXXXXX`). Next lo incorpora al código en el build: si lo cambiás, hay que volver a desplegar. El de `.env.example` (`595000000000`) es un marcador que no es de nadie; si falta la variable, los enlaces usan ese mismo marcador de `src/site.ts`. |

Con `NODE_ENV=production` la aplicación rechaza los valores de ejemplo de `.env.example`: con el `SESSION_SECRET` de ejemplo el admin falla con un error claro, y con la `ADMIN_PASSWORD` de ejemplo nadie puede entrar (el log avisa, sin escribir el valor). `DATABASE_URL` es obligatoria fuera de desarrollo y pruebas, tanto en la app como en `prisma.config.ts`. Si `ADMIN_PASSWORD` se pega con comillas o espacios alrededor (`"mi-clave"`), se ignoran.

Para generar un secreto: `openssl rand -base64 48`.

### El seed borra todo

`npx prisma db seed` **borra todos los productos, variantes y servicios** antes de recrearlos. Es solo para desarrollo y demos. No lo corras nunca contra una base con datos reales (ni en producción una vez que el local cargó sus productos).

## Antes de publicar: datos de ejemplo a reemplazar

- **Datos del local** en `src/site.ts`: dirección, horarios, Instagram, número de WhatsApp de respaldo y los textos de "Sobre El Barbudo" son datos de ejemplo.
- **Fotos de productos**: las del seed son marcadores de posición. Reemplazalas desde el admin (`/admin`, editar producto) pegando las URLs `https://` de las fotos reales, una por línea. Algunos productos no tienen foto y muestran un marcador neutro.
- **Logo**: `public/logo.jpg` es un JPG de 150 px, así que se ve algo suave al ampliarlo. Pedí a la marca el logo en SVG. Cambiar solo el archivo no alcanza: es un único componente, `src/components/ui/Logo.tsx`, usado en 3 lugares (Header, Footer y login del admin), y está pensado para ese JPG negro sobre blanco: la variante `mark` recorta la barba con posiciones fijas, ambas variantes pasan `width`/`height` de 150, y las clases `mix-blend-multiply dark:invert dark:mix-blend-screen` mezclan el fondo blanco y lo invierten en modo oscuro. Con un SVG hay que editar ese componente: actualizar `src`, rehacer o quitar el recorte de `mark` (conviene un SVG propio de solo la barba) y reemplazar el mezclado/inversión por `currentColor` o por una versión clara y otra oscura. Los íconos de la pestaña y de iOS (`src/app/icon.png`, 192 px, y `src/app/apple-icon.png`, 180 px) son la barba recortada de ese mismo JPG: rehacelos con el logo nuevo.

## Seguridad del admin

- La sesión es una **cookie sellada sin estado** (iron-session, 7 días): no hay sesiones en la base. Para **cerrar todas las sesiones** (por ejemplo si se filtró la contraseña) cambiá `SESSION_SECRET` y volvé a desplegar: todas las cookies existentes dejan de ser válidas.
- **No hay límite de intentos de inicio de sesión.** Usá una contraseña larga y única (una frase de 4 o más palabras o un valor generado) y no la reutilices.
- Cada página y cada acción del panel comprueban la sesión por su cuenta; no dependen solo del layout.

## Desplegar en Vercel con Neon (Postgres)

En local se usa SQLite. En producción necesitás una base persistente: Vercel no guarda archivos entre ejecuciones, así que `dev.db` no sirve allí. Esta guía usa Postgres en Neon.

1. **Creá la base en Neon** y copiá las dos cadenas de conexión que ofrece:
   - la **directa** (sin `-pooler` en el host): para las migraciones y el seed. `prisma migrate` necesita una conexión directa; con el pooler puede fallar o quedarse esperando.
   - la **con pooler** (host con `-pooler`): para la aplicación en Vercel, que abre muchas conexiones cortas.
2. **Cambiá el motor en un solo lugar** (el cliente y el esquema):
   - `src/lib/prisma-client.ts`: reemplazá el adapter de SQLite por el de Postgres.
     ```bash
     npm uninstall @prisma/adapter-better-sqlite3 better-sqlite3
     npm install @prisma/adapter-pg
     ```
     ```ts
     import { PrismaPg } from "@prisma/adapter-pg";
     // ...
     return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
     ```
     Ajustá también `DEV_DATABASE_URL` (el valor por defecto de desarrollo) o definí siempre `DATABASE_URL`.
   - `prisma/schema.prisma`: `datasource db { provider = "postgresql" }`.
   - El seed y la app usan esa misma fábrica, así que no hay más código que cambiar. Lo único que queda mirar es el valor por defecto de desarrollo (`file:./dev.db`) que también está en `prisma.config.ts`: solo aplica con `NODE_ENV` de desarrollo o pruebas, pero conviene actualizarlo o quitarlo.
3. **Regenerá las migraciones.** Las de `prisma/migrations` son específicas de SQLite: borrá esa carpeta y creá la inicial contra Postgres. Tu `.env` local sigue apuntando a SQLite, así que pasá la URL directa en el propio comando:
   ```bash
   rm -rf prisma/migrations
   DATABASE_URL="postgresql://USUARIO:CLAVE@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require" \
     npx prisma migrate dev --name init
   ```
   `migrate dev` contra Neon es **solo para este primer `init`, con la base vacía**: puede pedir resetear la base y borrar los datos. Contra la base de producción, después, solo `prisma migrate deploy` (paso 6).

   **Desarrollo local después del cambio.** Con el esquema en `postgresql`, el `file:./dev.db` de SQLite deja de servir. Elegí una de estas dos y poné su URL en tu `.env` como `DATABASE_URL`:
   - **Postgres local** (por ejemplo `docker run --name elbarbudo-db -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:17`, con `DATABASE_URL="postgresql://postgres:dev@localhost:5432/postgres"`).
   - **Una rama de desarrollo de Neon** (Branches → Create branch), con su URL directa. Es una copia aparte: lo que hagas ahí no toca producción.

   Ahí sí `npx prisma migrate dev` crea las migraciones nuevas y `npx prisma db seed` carga los datos de prueba, como antes. Las migraciones se suben al repositorio y llegan a producción con `migrate deploy`.
4. **Cargá el contenido real** desde el admin. Si querés datos de prueba en una base de staging, el seed los crea, pero **borra todo** (ver arriba). Mismo patrón, con la URL directa:
   ```bash
   DATABASE_URL="postgresql://USUARIO:CLAVE@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require" \
     npx prisma db seed
   ```
5. **Variables de entorno en Vercel** (Project Settings → Environment Variables), las 4, con valores fuertes y propios, distintos de los de `.env.example`:
   `DATABASE_URL` (la **con pooler** de Neon), `ADMIN_PASSWORD`, `SESSION_SECRET` (32 o más caracteres) y `NEXT_PUBLIC_WHATSAPP_NUMBER`.
6. **Build**: el comando por defecto de Vercel (`next build`) alcanza. En el deploy de producción (`VERCEL_ENV=production`) el build **falla a propósito** si `NEXT_PUBLIC_WHATSAPP_NUMBER` falta, no tiene dígitos o es el marcador `595000000000`, o si falta `DATABASE_URL`, `ADMIN_PASSWORD` o `SESSION_SECRET`; el error nombra la variable, nunca su valor (`src/lib/env-check.ts`). Así no se publica una tienda que manda los pedidos a un número que no es del local. Los deploys de preview y el `npm run build` local no hacen esta comprobación; para probarla en tu equipo: `CHECK_PROD_ENV=1 npm run build`. El script `postinstall` ya corre `prisma generate` al instalar dependencias. No pongas `prisma migrate deploy` en el build con la variable `DATABASE_URL` del proyecto, porque es la del pooler. Las migraciones nuevas se aplican desde tu equipo con la URL directa:
   ```bash
   DATABASE_URL="postgresql://...(directa)..." npx prisma migrate deploy
   ```
   Si preferís hacerlo en el build, definí una variable aparte con la URL directa (por ejemplo `DIRECT_DATABASE_URL`) y usá `DATABASE_URL="$DIRECT_DATABASE_URL" prisma migrate deploy && next build` como comando de build.

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
