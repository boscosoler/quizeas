import { errorResponse, handlePreflight, jsonResponse } from './lib/cors';
import { handleAdminCsv, handleAdminResults, handleAdminReset } from './routes/admin';
import { handleMatch } from './routes/match';
import { handleResults } from './routes/results';
import { handleStatus } from './routes/status';
import { handleSubmit } from './routes/submit';
import type { Env } from './lib/types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return handlePreflight();

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/' || path === '/api' || path === '/api/') {
        return jsonResponse({ ok: true, service: 'quizeas-worker' });
      }

      if (path === '/api/submit') return handleSubmit(request, env);
      if (path === '/api/status') return handleStatus(request, env);
      if (path === '/api/match') return handleMatch(request, env);

      if (path.startsWith('/api/results/')) {
        const sessionId = decodeURIComponent(path.slice('/api/results/'.length));
        return handleResults(request, env, sessionId);
      }

      if (path === '/api/admin/results') return handleAdminResults(request, env);
      if (path === '/api/admin/csv') return handleAdminCsv(request, env);
      if (path === '/api/admin/reset') return handleAdminReset(request, env);

      return errorResponse(404, 'Not found');
    } catch (err) {
      console.error('Unhandled error', err);
      const message = err instanceof Error ? err.message : 'Internal error';
      return errorResponse(500, message);
    }
  },
};
