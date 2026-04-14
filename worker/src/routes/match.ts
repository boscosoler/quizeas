import { isAuthorized } from '../lib/auth';
import { fillReasons } from '../lib/claude';
import { errorResponse, jsonResponse } from '../lib/cors';
import {
  deletePairsBlob,
  listParticipants,
  markMatchesGenerated,
  putMatchPointer,
  putPair,
  putPairsBlob,
  resetAll,
} from '../lib/kv';
import { greedyPairing } from '../lib/matching';
import { loadQuestions } from '../questions';
import type { Env, Participant } from '../lib/types';

/**
 * POST /api/match — protected with ADMIN_PASSWORD.
 * Runs the greedy pairing + Claude reasons, then persists pairs + pointers.
 * Idempotent-ish: re-running wipes previous pair data (not participants)
 * and recomputes everything.
 */
export async function handleMatch(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return errorResponse(405, 'Method not allowed');
  if (!isAuthorized(request, env)) return errorResponse(401, 'Unauthorized');

  const participants = await listParticipants(env);
  if (participants.length < 2) {
    return errorResponse(400, 'Need at least 2 participants to generate matches');
  }

  const questions = loadQuestions();

  // Wipe any previous pair:* and match:* keys so re-runs stay clean.
  await clearPairData(env);

  const pairs = greedyPairing(participants, questions);

  const byId = new Map<string, Participant>(
    participants.map((p) => [p.sessionId, p])
  );
  await fillReasons(env, pairs, byId, questions);

  // Persist pairs and session→pair pointers in parallel. Also write
  // the full pairs blob at meta:pairs so downstream admin endpoints
  // (CSV, admin results) can enumerate pairs with a strongly-consistent
  // single KV.get instead of going through KV.list, which was returning
  // empty for up to ~60s after these writes and leaving the CSV with
  // only headers.
  const writes: Promise<unknown>[] = [putPairsBlob(env, pairs)];
  for (const pair of pairs) {
    writes.push(putPair(env, pair));
    for (const m of pair.members) {
      writes.push(putMatchPointer(env, m.sessionId, pair.id));
    }
  }
  await Promise.all(writes);
  await markMatchesGenerated(env);

  // Return the fresh results in-band so the admin UI can render them
  // without a follow-up GET /api/admin/results. KV.list is eventually
  // consistent, so that second read can (and does) come back stale for
  // a while after the writes above — leaving the dashboard with no
  // table. The data is already in memory here; just hand it back.
  return jsonResponse({
    ok: true,
    participants: participants.map((p) => ({
      sessionId: p.sessionId,
      name: p.name,
      completedAt: p.completedAt,
    })),
    pairs,
  });
}

/**
 * Delete pair:* and match:* but keep participant:* — lets the admin
 * re-generate matches after late arrivals without losing responses.
 * Also drops meta:pairs so a subsequent listPairs doesn't serve the
 * previous generation's blob before the new one is written.
 */
async function clearPairData(env: Env): Promise<void> {
  await deletePairsBlob(env);
  const prefixes = ['pair:', 'match:'];
  for (const prefix of prefixes) {
    let cursor: string | undefined;
    do {
      const page = await env.KV.list({ prefix, cursor });
      await Promise.all(page.keys.map((k) => env.KV.delete(k.name)));
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
  }
}

// Re-export for testing / direct use if ever needed.
export { resetAll };
