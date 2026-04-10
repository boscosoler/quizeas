/**
 * CORS helpers. Permissive by design — this is a single-event app behind a
 * known domain, and the admin endpoints are password-protected.
 */

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
  'Access-Control-Max-Age': '86400',
};

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function handlePreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return withCors(
    new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...(init.headers ?? {}),
      },
    })
  );
}

export function errorResponse(status: number, message: string): Response {
  return jsonResponse({ error: message }, { status });
}
