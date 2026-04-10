# QuizEAS

Dinámica de networking con IA para el **Encuentro Anual SinOficina 2026**.

> Quiz tipo Kahoot en el móvil que, al terminar, empareja a cada participante con su match más afín usando un algoritmo + Claude. Spec completo en [`docs/quizeas.pdf`](docs/quizeas.pdf).

## Estructura

```
quizeas/
├── questions.json         # 11 preguntas (editable, fuente única de verdad)
├── web/                   # Frontend React + Vite + Tailwind → GitHub Pages
├── worker/                # Backend Cloudflare Worker + KV
└── .github/workflows/
    ├── deploy-web.yml     # push a main → Pages
    └── deploy-worker.yml  # push a main → Cloudflare
```

`web/public/questions.json` es un symlink al fichero del root. El worker
importa directamente `../../questions.json` en build time.

## Desarrollo local

```bash
# 1. Instala
npm install

# 2. Secretos del worker (una vez)
cp worker/.dev.vars.example worker/.dev.vars
#   edita ADMIN_PASSWORD y (opcional) ANTHROPIC_API_KEY
#   sin key → se usa fallback determinista y no se llama a Claude

# 3. Arranca web + worker a la vez
npm run dev
```

- **Participante** → http://localhost:5173/
- **Admin** → http://localhost:5173/admin (contraseña = `ADMIN_PASSWORD`)
- **Worker** → http://localhost:8787/

### Desde el móvil

El dev server de Vite escucha en LAN (`--host`). El problema es que el
frontend en el móvil intentaría llamar a `localhost:8787`, que es el propio
móvil. Solución: arranca todo apuntando al worker por la IP del portátil:

```bash
VITE_API_BASE=http://192.168.x.x:8787 npm run dev
```

(El worker ya escucha en `0.0.0.0:8787`.)

## Endpoints del Worker

| Método | Ruta                         | Auth  | Descripción                                  |
| ------ | ---------------------------- | ----- | -------------------------------------------- |
| POST   | `/api/submit`                | —     | Guardar respuestas de un participante        |
| GET    | `/api/status`                | —     | Nº de completados + `matchesGenerated`       |
| GET    | `/api/results/:sessionId`    | —     | Match de un participante                     |
| POST   | `/api/match`                 | admin | Calcula pairs + razones IA                   |
| GET    | `/api/admin/results`         | admin | Participants + pairs                         |
| GET    | `/api/admin/csv`             | admin | Descarga CSV                                 |
| POST   | `/api/admin/reset`           | admin | Borra participantes, pairs y pointers        |

Auth admin: header `X-Admin-Password: <ADMIN_PASSWORD>`.

## Arquitectura de despliegue

Dos piezas, dos hostings, dos subdominios:

```
┌─ quizeas.sinoficina.com ────────┐   ┌─ api.quizeas.sinoficina.com ─┐
│  SPA estática en GitHub Pages    │   │  Cloudflare Worker + KV       │
│  /       → flujo del participante│   │  /api/*                       │
│  /admin  → panel de administración│──▶│  Claude API (Anthropic)       │
└──────────────────────────────────┘   └───────────────────────────────┘
```

El frontend usa `VITE_API_BASE` en build time. En producción apunta a
`https://api.quizeas.sinoficina.com` (ver `web/src/api/base.ts`).

### Dos posibles URLs para la SPA

La misma build puede publicarse en dos sitios:

| URL                                    | `BASE_PATH`  | CNAME        |
| -------------------------------------- | ------------ | ------------ |
| `https://quizeas.sinoficina.com/`      | `/` (default)| incluido     |
| `https://boscosoler.github.io/quizeas/`| `/quizeas/`  | auto-strip   |

Cómo funciona:

- `web/vite.config.ts` lee `process.env.BASE_PATH`. Por defecto `/`. Si
  le pasas `/quizeas/` todos los assets y rutas se sirven bajo ese prefijo.
- Cuando `BASE_PATH` no es `/`, un plugin de Vite borra `dist/CNAME`
  antes de publicar (porque el CNAME solo tiene sentido en la build
  del dominio custom).
- `web/public/404.html` detecta al vuelo si está en `*.github.io/quizeas`
  y usa `segmentCount = 1`; en cualquier otro host usa `0`.
- `web/src/main.tsx` recorta `import.meta.env.BASE_URL` antes de
  decidir si estamos en `/admin`, así que el panel funciona tanto en
  `/admin` como en `/quizeas/admin`.

Para activar el build de la project page en CI basta con crear la
repo variable `BASE_PATH = /quizeas/` en GitHub (Settings → Secrets
and variables → Actions → Variables). Quítala (o ponla a `/`) para
volver a la build del dominio custom.

Build local de la project page:

```bash
BASE_PATH=/quizeas/ npm run build --workspace=web
```

## Cómo desplegar (primera vez)

Ver **CHECKLIST DE DESPLIEGUE** más abajo. Contiene todo lo que tienes que
hacer manualmente (DNS, GitHub secrets, primer `wrangler deploy`, etc.).

## Estado actual

- ✅ **Fase 1** — flujo participante (Welcome → Name → Quiz → Waiting).
- ✅ **Fase 2** — Worker, KV, matching, Claude, frontend conectado, reveal.
- ✅ **Fase 3** — panel admin (/admin), SPA fallback, workflows CI/CD.
