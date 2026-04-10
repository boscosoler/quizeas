import { errorResponse, jsonResponse } from '../lib/cors';
import { areMatchesGenerated, listParticipants } from '../lib/kv';
import type { Env } from '../lib/types';

export async function handleStatus(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return errorResponse(405, 'Method not allowed');

  const participants = await listParticipants(env);
  const matchesGenerated = await areMatchesGenerated(env);

  return jsonResponse({
    completed: participants.length,
    matchesGenerated,
  });
}
