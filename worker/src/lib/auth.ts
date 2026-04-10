import type { Env } from './types';

/**
 * Admin auth. Expects the X-Admin-Password header to match env.ADMIN_PASSWORD.
 * Constant-time comparison to avoid timing leaks.
 */
export function isAuthorized(request: Request, env: Env): boolean {
  const provided = request.headers.get('X-Admin-Password') ?? '';
  const expected = env.ADMIN_PASSWORD ?? '';
  if (!expected) return false;
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
