import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The app ships to two possible URLs:
//
//   1. https://quizeas.sinoficina.com/            (custom domain → base "/")
//   2. https://boscosoler.github.io/quizeas/      (project page  → base "/quizeas/")
//
// Same codebase, two base paths. Controlled at build time via BASE_PATH.
// Defaults to "/" so the production custom-domain build stays a no-op.
const BASE_PATH = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The CNAME file in public/ hardcodes the custom domain. If we leave it in
 * the project-page build, GitHub Pages will try to serve that build from
 * quizeas.sinoficina.com too — breaking whichever deployment is meant to
 * live at boscosoler.github.io/quizeas/. Strip it when building with a
 * non-root base.
 */
function stripCnameForProjectPage(): Plugin {
  return {
    name: 'quizeas:strip-cname-for-project-page',
    apply: 'build',
    closeBundle() {
      if (BASE_PATH === '/') return;
      const cname = path.resolve(__dirname, 'dist/CNAME');
      if (fs.existsSync(cname)) fs.unlinkSync(cname);
    },
  };
}

export default defineConfig({
  base: BASE_PATH,
  plugins: [react(), stripCnameForProjectPage()],
  server: {
    port: 5173,
    host: true,
  },
});
