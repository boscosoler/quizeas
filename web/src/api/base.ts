/**
 * Where the Worker lives.
 *
 * - Dev (Vite): the Worker runs on :8787 next to the Vite dev server.
 * - Prod: hardcoded to the api.quizeas.sinoficina.com custom domain bound
 *   to the Worker in Cloudflare. GitHub Pages hosts the SPA on the bare
 *   quizeas.sinoficina.com; it can't proxy /api/*, so the API is on a
 *   separate subdomain.
 *
 * Override at build time with VITE_API_BASE if you deploy elsewhere.
 */
const fromEnv = import.meta.env.VITE_API_BASE as string | undefined;

export const API_BASE: string =
  fromEnv ??
  (import.meta.env.DEV
    ? 'http://localhost:8787'
    : 'https://api.quizeas.sinoficina.com');

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
