import type { Answer } from './types';

const STATE_KEY = 'quizeas:state';

export interface PersistedState {
  step: 'welcome' | 'name' | 'quiz' | 'waiting' | 'match';
  name: string;
  currentIndex: number;
  answers: Answer[];
}

export function loadState(): PersistedState | null {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): void {
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function clearState(): void {
  try {
    sessionStorage.removeItem(STATE_KEY);
  } catch {
    // ignore
  }
}
