import type { Answer, Env, Member, Pair, Participant, Question } from './types';
import { buildPairPrompt } from './prompt';

/** Small bounded-concurrency map so we don't fan-out 150 requests at once. */
async function poolMap<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function callClaude(env: Env, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: env.MATCH_MODEL,
      max_tokens: 240,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Claude API ${res.status}: ${body.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';
  return text;
}

/**
 * Fallback when ANTHROPIC_API_KEY is not set — handy for local dev. Produces
 * a deterministic reason based on the shared answers so the full flow can be
 * exercised without burning credits.
 */
function fallbackReason(
  members: Array<Member & { answers: Answer[] }>,
  questions: Question[]
): string {
  const shared: string[] = [];
  const first = members[0];
  for (const q of questions) {
    if (q.type !== 'choice' || q.matchWeight === 0) continue;
    const firstOpt = first.answers.find((a) => a.questionId === q.id)?.optionIndex;
    if (firstOpt == null) continue;
    const allAgree = members.every(
      (m) => m.answers.find((a) => a.questionId === q.id)?.optionIndex === firstOpt
    );
    if (allAgree) shared.push(q.options[firstOpt] ?? '');
  }
  const picks = shared.slice(0, 3).filter(Boolean).join(', ');
  if (picks) {
    return `Coincidís en cosas muy concretas: ${picks}. Esta conversación se escribe sola. (demo mode)`;
  }
  return 'No coincidís casi en nada según el algoritmo, así que tenéis MUCHO de qué hablar. (demo mode)';
}

/**
 * Attach `reason` to every pair, in parallel, with bounded concurrency and
 * a per-pair fallback so one bad response doesn't break the whole batch.
 */
export async function fillReasons(
  env: Env,
  pairs: Pair[],
  participantsById: Map<string, Participant>,
  questions: Question[]
): Promise<void> {
  const hasKey = Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.length > 8);

  await poolMap(pairs, 8, async (pair) => {
    const members = pair.members.map((m) => {
      const p = participantsById.get(m.sessionId);
      return { sessionId: m.sessionId, name: m.name, answers: p?.answers ?? [] };
    });

    if (!hasKey) {
      pair.reason = fallbackReason(members, questions);
      return;
    }

    try {
      const prompt = buildPairPrompt(members, questions);
      const text = await callClaude(env, prompt);
      pair.reason = text || fallbackReason(members, questions);
    } catch (err) {
      console.error('Claude call failed for pair', pair.id, err);
      pair.reason = fallbackReason(members, questions);
    }
  });
}
