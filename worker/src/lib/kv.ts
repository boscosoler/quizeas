import type { Env, Participant, Pair } from './types';

/**
 * KV access layer. All keys are prefixed so /admin/reset can sweep safely
 * even if the namespace is shared with other data.
 *
 * Layout:
 *   participant:{sessionId}  -> Participant
 *   pair:{uuid}              -> Pair (canonical body, per-participant lookup)
 *   match:{sessionId}        -> pairId (pointer for fast participant lookup)
 *   meta:matchesGenerated    -> "1" once /api/match has run
 *   meta:count               -> decimal string; live participant counter
 *   meta:pairs               -> JSON array of all Pair bodies, written
 *                               atomically at match-generation time so
 *                               CSV/admin listings can avoid KV.list
 *                               (which is eventually consistent and was
 *                               returning empty right after generation).
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

/**
 * Persist the full set of pairs as a single JSON blob at meta:pairs.
 * Strongly consistent on read (unlike KV.list), so downstream admin
 * endpoints can enumerate pairs right after generation without hitting
 * the list-index staleness window.
 */
export async function putPairsBlob(env: Env, pairs: Pair[]): Promise<void> {
  await env.KV.put(PAIRS_BLOB_KEY, JSON.stringify(pairs));
}

export async function getPairsBlob(env: Env): Promise<Pair[] | null> {
  const raw = await env.KV.get(PAIRS_BLOB_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Pair[]) : null;
  } catch {
    return null;
  }
}

export async function deletePairsBlob(env: Env): Promise<void> {
  await env.KV.delete(PAIRS_BLOB_KEY);
}

/**
 * All pairs, in one list. Prefers the meta:pairs blob (strong read)
 * and only falls back to the legacy list-then-get path when the blob
 * is missing (e.g. data left over from a previous deploy). That list
 * path is eventually consistent — which is exactly why we added the
 * blob — so it's only here as a compatibility net.
 */
export async function listPairs(env: Env): Promise<Pair[]> {
  const blob = await getPairsBlob(env);
  if (blob !== null) return blob;

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

const COUNT_KEY = PREFIX.meta + 'count';
const PAIRS_BLOB_KEY = PREFIX.meta + 'pairs';

export async function markMatchesGenerated(env: Env): Promise<void> {
  await env.KV.put(PREFIX.meta + 'matchesGenerated', '1');
}

export async function areMatchesGenerated(env: Env): Promise<boolean> {
  return (await env.KV.get(PREFIX.meta + 'matchesGenerated')) === '1';
}

/**
 * Read the participant counter. Single KV.get — O(1) regardless of
 * how many participants exist. Replaces the former KV.list scan that
 * was burning through list operations on every /api/status poll.
 *
 * One-time backfill: if the counter key is missing (fresh deploy over
 * pre-existing participant data), seed it by listing once. Subsequent
 * calls in this isolate and all other isolates hit the cached key and
 * never list again. Callers that increment the counter also benefit,
 * so submits don't undercount pre-existing participants either.
 */
export async function getParticipantCount(env: Env): Promise<number> {
  const raw = await env.KV.get(COUNT_KEY);
  if (raw !== null) {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  // Seed from the current participant prefix. Only pages keys, no bodies.
  let total = 0;
  let cursor: string | undefined;
  do {
    const page = await env.KV.list({ prefix: PREFIX.participant, cursor });
    total += page.keys.length;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  await env.KV.put(COUNT_KEY, String(total));
  return total;
}

/**
 * Bump the counter by one. Call only when a genuinely new participant
 * record is being created (not on upserts from a resubmit).
 *
 * Not atomic: two concurrent new-participant submits could both read
 * N and both write N+1, undercounting by 1. For a ~150-person live
 * event with mostly-serial submits this is acceptable; the alternative
 * (Durable Object for strict atomicity) is overkill. The counter is
 * advisory anyway — the admin still sees the authoritative list in
 * /api/admin/results.
 */
export async function incrementParticipantCount(env: Env): Promise<void> {
  const current = await getParticipantCount(env);
  await env.KV.put(COUNT_KEY, String(current + 1));
}

// ── Reset ─────────────────────────────────────────────────────────────────

/**
 * Wipe every key under the participant:, pair:, match: and meta: prefixes.
 *
 * This fights against two quirks of Cloudflare KV:
 *
 *   1. KV.list pages at most 1000 keys per call — we already paginate
 *      via cursor, but be explicit about it and about the limit so
 *      nobody accidentally reintroduces a non-paginated call.
 *
 *   2. KV.list is *eventually consistent*: recent writes may not appear
 *      immediately, and concurrent submits during a reset could slip
 *      keys past a single sweep. Loop each prefix with a safety cap
 *      until a pass finds nothing.
 *
 * And — crucially — end by writing meta:count=0 explicitly. Otherwise
 * the next getParticipantCount after reset sees a missing counter key
 * and falls into its list-based backfill, which briefly sees the ghost
 * participant keys still in the list index (they're marked deleted but
 * KV.list hasn't caught up yet). That was re-inflating the counter to
 * its pre-reset value and breaking match generation downstream. A
 * hard-coded 0 short-circuits the backfill path entirely.
 */
export async function resetAll(env: Env): Promise<void> {
  const MAX_PASSES = 5;
  const LIST_LIMIT = 1000;

  // Belt and suspenders: delete known singleton meta keys by name, even
  // if the list index happens not to surface them on this call.
  await Promise.all([
    env.KV.delete(COUNT_KEY),
    env.KV.delete(PAIRS_BLOB_KEY),
    env.KV.delete(PREFIX.meta + 'matchesGenerated'),
  ]);

  for (const prefix of Object.values(PREFIX)) {
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      let deletedThisPass = 0;
      let cursor: string | undefined;
      do {
        const page = await env.KV.list({ prefix, cursor, limit: LIST_LIMIT });
        if (page.keys.length > 0) {
          await Promise.all(page.keys.map((k) => env.KV.delete(k.name)));
          deletedThisPass += page.keys.length;
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      if (deletedThisPass === 0) break;
    }
  }

  // Seed the counter so the post-reset getParticipantCount never takes
  // the list-based backfill path. See the doc block above.
  await env.KV.put(COUNT_KEY, '0');
}
