import { isAuthorized } from '../lib/auth';
import { errorResponse, jsonResponse, withCors } from '../lib/cors';
import { buildCsv } from '../lib/csv';
import { listPairs, listParticipants, resetAll } from '../lib/kv';
import { loadQuestions } from '../questions';
import type { Env, Participant } from '../lib/types';

export async function handleAdminResults(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'GET') return errorResponse(405, 'Method not allowed');
  if (!isAuthorized(request, env)) return errorResponse(401, 'Unauthorized');

  const [participants, pairs] = await Promise.all([
    listParticipants(env),
    listPairs(env),
  ]);

  return jsonResponse({
    participants: participants.map((p) => ({
      sessionId: p.sessionId,
      name: p.name,
      completedAt: p.completedAt,
    })),
    pairs,
  });
}

export async function handleAdminCsv(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'GET') return errorResponse(405, 'Method not allowed');
  if (!isAuthorized(request, env)) return errorResponse(401, 'Unauthorized');

  const [participants, pairs] = await Promise.all([
    listParticipants(env),
    listPairs(env),
  ]);
  const byId = new Map<string, Participant>(
    participants.map((p) => [p.sessionId, p])
  );
  const csv = buildCsv(pairs, byId, loadQuestions());

  return withCors(
    new Response('\ufeff' + csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="quizeas-matches-${Date.now()}.csv"`,
      },
    })
  );
}

export async function handleAdminReset(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'POST') return errorResponse(405, 'Method not allowed');
  if (!isAuthorized(request, env)) return errorResponse(401, 'Unauthorized');
  await resetAll(env);
  return jsonResponse({ ok: true });
}
