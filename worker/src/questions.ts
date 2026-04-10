/**
 * The Worker ships with a snapshot of the quiz questions, imported at build
 * time from the repo-root questions.json. Matching logic needs weights and
 * correct answers, not just the text, so we can't rely on whatever the
 * frontend has cached in the participant's browser.
 *
 * Editing questions.json and redeploying the worker is the supported workflow.
 */
import raw from '../../questions.json';
import type { Question, QuestionsFile } from './lib/types';

const file = raw as QuestionsFile;

export function loadQuestions(): Question[] {
  return [...file.questions].sort((a, b) => a.id - b.id);
}
