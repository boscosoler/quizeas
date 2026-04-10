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

/** Stored answer: optionIndex for choice questions, value for text questions. */
export interface Answer {
  questionId: number;
  optionIndex: number | null;
  value: string | null;
}

export type Step = 'welcome' | 'name' | 'quiz' | 'waiting' | 'match';
