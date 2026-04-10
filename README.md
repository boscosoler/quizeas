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

## Cómo desplegar (primera vez)

Ver **CHECKLIST DE DESPLIEGUE** más abajo. Contiene todo lo que tienes que
hacer manualmente (DNS, GitHub secrets, primer `wrangler deploy`, etc.).

## Estado actual

- ✅ **Fase 1** — flujo participante (Welcome → Name → Quiz → Waiting).
- ✅ **Fase 2** — Worker, KV, matching, Claude, frontend conectado, reveal.
- ✅ **Fase 3** — panel admin (/admin), SPA fallback, workflows CI/CD.
