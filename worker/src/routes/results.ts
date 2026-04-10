import { errorResponse, jsonResponse } from '../lib/cors';
import { getPairForSession } from '../lib/kv';
import type { Env, MatchPendingView, MatchView } from '../lib/types';

export async function handleResults(
  request: Request,
  env: Env,
  sessionId: string
): Promise<Response> {
  if (request.method !== 'GET') return errorResponse(405, 'Method not allowed');
  if (!sessionId) return errorResponse(400, 'Missing sessionId');

  const pair = await getPairForSession(env, sessionId);
  if (!pair) {
    const pending: MatchPendingView = { ready: false };
    return jsonResponse(pending);
  }

  const partners = pair.members.filter((m) => m.sessionId !== sessionId);
  const view: MatchView = {
    ready: true,
    type: pair.type,
    partners,
    percentage: pair.percentage,
    reason: pair.reason,
  };
  return jsonResponse(view);
}
