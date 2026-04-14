import type { Env, Participant, Pair } from './types';

/**
 * KV access layer. All keys are prefixed so /admin/reset can sweep safely
 * even if the namespace is shared with other data.
 *
 * Layout:
 *   participant:{sessionId}  -> Participant
 *   pair:{uuid}              -> Pair (canonical, used by admin/listing)
 *   match:{sessionId}        -> pointer { pairId } for fast participant lookup
 *   meta:matchesGenerated    -> "1" once /api/match has run
 */

const PREFIX = {
  participant: 'participant:',
  pair: 'pair:',
  match: 'match:',
  meta: 'meta:',
} as const;

// ── Participants ──────────────────────────────────────────────────────────

export async function putParticipant(env: Env, p: Participant): Promise<void> {
  await env.KV.put(PREFIX.participant + p.sessionId, JSON.stringify(p));
}

export async function getParticipant(
  env: Env,
  sessionId: string
): Promise<Participant | null> {
  const raw = await env.KV.get(PREFIX.participant + sessionId);
  return raw ? (JSON.parse(raw) as Participant) : null;
}

/**
 * Count participants without fetching each record. Used by /api/status,
 * which only needs the number, not the bodies — this drops the per-call
 * cost from 1 list + N gets down to just the list pagination.
 */
export async function countParticipants(env: Env): Promise<number> {
  let total = 0;
  let cursor: string | undefined;
  do {
    const page = await env.KV.list({ prefix: PREFIX.participant, cursor });
    total += page.keys.length;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return total;
}

export async function listParticipants(env: Env): Promise<Participant[]> {
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.KV.list({ prefix: PREFIX.participant, cursor });
    for (const k of page.keys) keys.push(k.name);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  // Fetch each in parallel. 150 keys is trivial.
  const results = await Promise.all(
    keys.map(async (k) => {
      const raw = await env.KV.get(k);
      return raw ? (JSON.parse(raw) as Participant) : null;
    })
  );
  return results.filter((p): p is Participant => p !== null);
}

// ── Pairs + Matches ───────────────────────────────────────────────────────

export async function putPair(env: Env, pair: Pair): Promise<void> {
  await env.KV.put(PREFIX.pair + pair.id, JSON.stringify(pair));
}

export async function listPairs(env: Env): Promise<Pair[]> {
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.KV.list({ prefix: PREFIX.pair, cursor });
    for (const k of page.keys) keys.push(k.name);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const pairs = await Promise.all(
    keys.map(async (k) => {
      const raw = await env.KV.get(k);
      return raw ? (JSON.parse(raw) as Pair) : null;
    })
  );
  return pairs.filter((p): p is Pair => p !== null);
}

/** Store a session → pair pointer so GET /api/results/:id is a single read. */
export async function putMatchPointer(
  env: Env,
  sessionId: string,
  pairId: string
): Promise<void> {
  await env.KV.put(PREFIX.match + sessionId, pairId);
}

export async function getPairForSession(
  env: Env,
  sessionId: string
): Promise<Pair | null> {
  const pairId = await env.KV.get(PREFIX.match + sessionId);
  if (!pairId) return null;
  const raw = await env.KV.get(PREFIX.pair + pairId);
  return raw ? (JSON.parse(raw) as Pair) : null;
}

// ── Meta ──────────────────────────────────────────────────────────────────

export async function markMatchesGenerated(env: Env): Promise<void> {
  await env.KV.put(PREFIX.meta + 'matchesGenerated', '1');
}

export async function areMatchesGenerated(env: Env): Promise<boolean> {
  return (await env.KV.get(PREFIX.meta + 'matchesGenerated')) === '1';
}

// ── Reset ─────────────────────────────────────────────────────────────────

/** Delete everything under the known prefixes. */
export async function resetAll(env: Env): Promise<void> {
  const prefixes = Object.values(PREFIX);
  for (const prefix of prefixes) {
    let cursor: string | undefined;
    do {
      const page = await env.KV.list({ prefix, cursor });
      await Promise.all(page.keys.map((k) => env.KV.delete(k.name)));
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
  }
}
