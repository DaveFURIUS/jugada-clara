# Jugada Clara

[Abrir la web](https://davefurius.github.io/jugada-clara/)

Analizador de ajedrez en español con Stockfish 19 en el navegador. No necesita servidor de
cálculo, cuentas, claves privadas ni Python.

## Desarrollo

Requisitos: Node.js 22 o posterior (24 recomendado).

```sh
npm ci
npm run prepare:engine
npm run dev
```

La base y la URL pública por defecto son las de este repositorio en GitHub
Pages. Si alojas una copia en otra dirección, configura `BASE_PATH`, `SITE_URL`
y `VITE_REPO_URL` antes de compilar.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Publicación

GitHub Pages publica la rama `gh-pages`. Para una nueva versión, sube primero
los cambios de código a `main` y ejecuta `npm run deploy:pages`. Este comando
ejecuta las pruebas, compila la web y envía el resultado a `gh-pages`; GitHub
Pages se actualiza desde esa rama. No se suben `node_modules` ni los motores
binarios al historial de `main`: se obtienen de `stockfish@19.0.0` con el
lockfile. El motor completo (99 MB) está incluido en la rama publicada para
que el análisis funcione sin servidores externos.

## Cómo funciona

- Stockfish 19 completo (99 MB) y ligero (2 MB), servidos desde el mismo sitio.
- Cálculo UCI en un Web Worker para mantener la interfaz disponible.
- Un hilo de ejecución para funcionar en GitHub Pages sin cabeceras especiales.
- El motor completo utiliza 128 MB de hash; el ligero, 32 MB.
- Validación del FEN y jugadas con chess.js, explicaciones en español.
- Las posiciones nunca se envían al alojamiento. No hay analítica ni cookies.

La precisión depende del motor, el tiempo y la potencia del equipo. Un FEN no
aporta el historial completo para evaluar todas las tablas por repetición.
La herramienta admite ajedrez estándar, no variantes como Chess960.

## SEO

Contenido HTML en español disponible sin JavaScript, título y descripción,
una única cabecera H1, estructura accesible, canonical, Open Graph, datos
estructurados WebApplication, sitemap y diseño adaptable. El motor solo se
descarga cuando se solicita análisis, no al cargar la página.

Google decide la indexación y la posición; no se garantiza aparecer primero.
Después de publicar, el propietario puede verificar el sitio en Search Console
y enviar `sitemap.xml`. La web no dispone de acceso a Search Console. Un dominio
propio es opcional y no se ha comprado. En Pages de proyecto, robots.txt se sirve
en la subruta; las reglas de robots del dominio raíz prevalecen si las hay.

Referencia: [Guía oficial de SEO de Google](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=es).

## Licencias

Este proyecto se distribuye bajo GPL-3.0; consulta LICENSE y THIRD_PARTY.md.
Stockfish.js se incluye sin modificaciones y mantiene su licencia y atribución.
