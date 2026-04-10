/**
 * Where the Worker lives.
 *
 * - Dev (Vite): the Worker runs on :8787 next to the Vite dev server.
 * - Prod: hardcoded to the default workers.dev hostname for this Worker.
 *   The SPA and the API live on different origins (Pages vs Workers),
 *   so CORS is permissive on the Worker side.
 *
 * Override at build time with VITE_API_BASE if you deploy elsewhere.
 */
const fromEnv = import.meta.env.VITE_API_BASE as string | undefined;

export const API_BASE: string =
  fromEnv ??
  (import.meta.env.DEV
    ? 'http://localhost:8787'
    : 'https://quizeas.bosco-soler.workers.dev');

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
