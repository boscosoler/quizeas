import { errorResponse, jsonResponse } from '../lib/cors';
import { getParticipant, putParticipant } from '../lib/kv';
import type { Answer, Env, Participant } from '../lib/types';

interface SubmitBody {
  sessionId?: unknown;
  name?: unknown;
  answers?: unknown;
}

function parseAnswers(raw: unknown): Answer[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Answer[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const r = item as Record<string, unknown>;
    if (typeof r.questionId !== 'number') return null;
    const optionIndex =
      typeof r.optionIndex === 'number' ? r.optionIndex : r.optionIndex === null ? null : null;
    const value = typeof r.value === 'string' ? r.value : r.value === null ? null : null;
    out.push({ questionId: r.questionId, optionIndex, value });
  }
  return out;
}

export async function handleSubmit(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return errorResponse(405, 'Method not allowed');

  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return errorResponse(400, 'Invalid JSON');
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const answers = parseAnswers(body.answers);

  if (!sessionId) return errorResponse(400, 'Missing sessionId');
  if (name.length < 2) return errorResponse(400, 'Invalid name');
  if (!answers) return errorResponse(400, 'Invalid answers');

  // Upsert — submitting again overwrites (handy when participant refreshes).
  const existing = await getParticipant(env, sessionId);
  const now = Date.now();
  const participant: Participant = {
    sessionId,
    name,
    answers,
    createdAt: existing?.createdAt ?? now,
    completedAt: now,
  };
  await putParticipant(env, participant);

  return jsonResponse({ ok: true });
}
