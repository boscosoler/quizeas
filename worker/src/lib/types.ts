/**
 * Shared types for the QuizEAS worker.
 * Keep in sync with web/src/lib/types.ts (the spec explicitly chose duplication
 * over a shared package for this small project).
 */

export type QuestionType = 'text' | 'choice';

export interface Question {
  id: number;
  text: string;
  type: QuestionType;
  options: string[];
  category: string;
  matchWeight: 0 | 1 | 2 | 3;
  correctAnswer: number | null;
}

export interface QuestionsFile {
  questions: Question[];
}

export interface Answer {
  questionId: number;
  /** Selected option index for choice questions. */
  optionIndex: number | null;
  /** Free-text value for text questions (name on q0). */
  value: string | null;
}

export interface Participant {
  sessionId: string;
  name: string;
  answers: Answer[];
  createdAt: number;
  completedAt: number;
}

export type PairType = 'pair' | 'trio';

export interface Member {
  sessionId: string;
  name: string;
}

export interface Pair {
  id: string;
  type: PairType;
  members: Member[];
  /** Compatibility percentage (0–100) shown to participants. */
  percentage: number;
  reason: string;
}

/** Match result returned to a single participant (GET /api/results/:id). */
export interface MatchView {
  ready: true;
  type: PairType;
  /** The other member(s) of the pair/trio, from this participant's perspective. */
  partners: Member[];
  percentage: number;
  reason: string;
}

export interface MatchPendingView {
  ready: false;
}

export interface Env {
  KV: KVNamespace;
  ANTHROPIC_API_KEY: string;
  ADMIN_PASSWORD: string;
  MATCH_MODEL: string;
}
