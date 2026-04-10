import { apiUrl } from './base';

/**
 * Admin API wrapper: attaches X-Admin-Password to every request,
 * throws AuthError on 401 so callers can kick back to the login screen,
 * and keeps the password in sessionStorage (scoped to the tab).
 */

const PW_KEY = 'quizeas:adminPassword';

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

export function getStoredPassword(): string | null {
  try {
    return sessionStorage.getItem(PW_KEY);
  } catch {
    return null;
  }
}

export function storePassword(pw: string): void {
  try {
    sessionStorage.setItem(PW_KEY, pw);
  } catch {
    /* ignore */
  }
}

export function clearPassword(): void {
  try {
    sessionStorage.removeItem(PW_KEY);
  } catch {
    /* ignore */
  }
}

async function adminFetch(
  path: string,
  init: RequestInit = {},
  passwordOverride?: string
): Promise<Response> {
  const pw = passwordOverride ?? getStoredPassword() ?? '';
  const headers = new Headers(init.headers);
  headers.set('X-Admin-Password', pw);
  const res = await fetch(apiUrl(path), { ...init, headers });
  if (res.status === 401) {
    clearPassword();
    throw new AuthError();
  }
  return res;
}

// ── Types ────────────────────────────────────────────────────────────────

export interface AdminMember {
  sessionId: string;
  name: string;
}

export interface AdminPair {
  id: string;
  type: 'pair' | 'trio';
  members: AdminMember[];
  percentage: number;
  reason: string;
}

export interface AdminParticipant {
  sessionId: string;
  name: string;
  completedAt: number;
}

export interface AdminResults {
  participants: AdminParticipant[];
  pairs: AdminPair[];
}

// ── Endpoints ────────────────────────────────────────────────────────────

/**
 * Verify a password by attempting to fetch admin results.
 * On success the password is stored and results are returned.
 */
export async function verifyAndStorePassword(pw: string): Promise<AdminResults> {
  const res = await adminFetch('/api/admin/results', { method: 'GET' }, pw);
  if (!res.ok) throw new Error(`unexpected ${res.status}`);
  storePassword(pw);
  return (await res.json()) as AdminResults;
}

export async function fetchAdminResults(): Promise<AdminResults> {
  const res = await adminFetch('/api/admin/results');
  if (!res.ok) throw new Error(`results failed (${res.status})`);
  return (await res.json()) as AdminResults;
}

export interface GenerateMatchesResult {
  ok: true;
  participants: number;
  pairs: number;
}

export async function generateMatches(): Promise<GenerateMatchesResult> {
  const res = await adminFetch('/api/match', { method: 'POST' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`match failed (${res.status}): ${body}`);
  }
  return (await res.json()) as GenerateMatchesResult;
}

export async function resetAll(): Promise<void> {
  const res = await adminFetch('/api/admin/reset', { method: 'POST' });
  if (!res.ok) throw new Error(`reset failed (${res.status})`);
}

/** Fetch the CSV as a blob and trigger a browser download. */
export async function downloadCsv(): Promise<void> {
  const res = await adminFetch('/api/admin/csv');
  if (!res.ok) throw new Error(`csv failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quizeas-matches-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
