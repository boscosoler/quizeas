const SESSION_ID_KEY = 'quizeas:sessionId';

function generateId(): string {
  // Crypto-strong UUID when available, fallback otherwise.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const id = generateId();
    sessionStorage.setItem(SESSION_ID_KEY, id);
    return id;
  } catch {
    // sessionStorage may be unavailable (private mode, SSR). Fall back to in-memory.
    return generateId();
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_ID_KEY);
  } catch {
    // ignore
  }
}
