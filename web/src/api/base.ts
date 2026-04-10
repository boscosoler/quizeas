/**
 * Where the Worker lives.
 *
 * - Dev (Vite): the Worker runs on :8787 next to the Vite dev server.
 * - Prod: hardcoded to the default workers.dev hostname for this Worker.
 *   The SPA and the API live on different origins (Pages vs Workers),
 *   so CORS is permissive on the Worker side.
 *
 * Override at build time with VITE_API_BASE if you deploy elsewhere.
 *
 * NOTE: we coerce empty strings to undefined before the `??` fallback.
 * GitHub Actions expands `${{ vars.VITE_API_BASE }}` to "" when the repo
 * variable is unset, and `"" ?? fallback` resolves to "" (not the
 * fallback) — which would turn every apiUrl() into a relative path
 * served by GitHub Pages and 405 every POST. Don't let that happen.
 */
const rawEnv = import.meta.env.VITE_API_BASE as string | undefined;
const fromEnv = rawEnv && rawEnv.trim() !== '' ? rawEnv.trim() : undefined;

export const API_BASE: string =
  fromEnv ??
  (import.meta.env.DEV
    ? 'http://localhost:8787'
    : 'https://quizeas.bosco-soler.workers.dev');

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
