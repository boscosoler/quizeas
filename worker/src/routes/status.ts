import { errorResponse, jsonResponse } from '../lib/cors';
import { areMatchesGenerated, getParticipantCount } from '../lib/kv';
import type { Env } from '../lib/types';

/**
 * GET /api/status — lightweight counter polled by the admin dashboard.
 *
 * Two optimisations over the naive version:
 *
 *   1. getParticipantCount reads a single `meta:count` key maintained
 *      incrementally by /api/submit. No KV.list involved, regardless
 *      of participant count.
 *   2. A small per-isolate cache. Worker isolates are reused across
 *      requests in the same colo, so when the admin polls every 3s the
 *      second+ call in the TTL window returns memoised state and does
 *      zero KV reads.
 *
 * TTL is short (2s) so freshness is fine for a live count. The cache is
 * cleared out of band by writes we don't see from here — but since
 * /api/status is only used by the admin for a live counter, a 2s lag
 * is imperceptible and the data is self-healing on the next fetch.
 */

const STATUS_CACHE_TTL_MS = 2000;

interface CachedStatus {
  body: { completed: number; matchesGenerated: boolean };
  expiresAt: number;
}

// Module-level (per-isolate) cache. Safe across requests because the
// payload is not user-scoped.
let cached: CachedStatus | null = null;

export async function handleStatus(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return errorResponse(405, 'Method not allowed');

  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return jsonResponse(cached.body);
  }

  const [completed, matchesGenerated] = await Promise.all([
    getParticipantCount(env),
    areMatchesGenerated(env),
  ]);

  const body = { completed, matchesGenerated };
  cached = { body, expiresAt: now + STATUS_CACHE_TTL_MS };
  return jsonResponse(body);
}
