import { apiUrl } from './base';
import type { Answer } from '../lib/types';

export interface SubmitPayload {
  sessionId: string;
  name: string;
  answers: Answer[];
}

export async function submitAnswers(payload: SubmitPayload): Promise<void> {
  const res = await fetch(apiUrl('/api/submit'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`submit failed (${res.status}): ${body}`);
  }
}

export interface Member {
  sessionId: string;
  name: string;
}

export type MatchResult =
  | { ready: false }
  | {
      ready: true;
      type: 'pair' | 'trio';
      partners: Member[];
      percentage: number;
      reason: string;
    };

export async function fetchResults(sessionId: string): Promise<MatchResult> {
  const res = await fetch(apiUrl(`/api/results/${encodeURIComponent(sessionId)}`));
  if (!res.ok) {
    throw new Error(`results failed (${res.status})`);
  }
  return (await res.json()) as MatchResult;
}

export interface Status {
  completed: number;
  matchesGenerated: boolean;
}

export async function fetchStatus(): Promise<Status> {
  const res = await fetch(apiUrl('/api/status'));
  if (!res.ok) throw new Error(`status failed (${res.status})`);
  return (await res.json()) as Status;
}
