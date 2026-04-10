import { useEffect, useState } from 'react';
import type { Question, QuestionsFile } from '../lib/types';

interface State {
  loading: boolean;
  error: string | null;
  questions: Question[];
}

export function useQuestions(): State {
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    questions: [],
  });

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}questions.json`, { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<QuestionsFile>;
      })
      .then((data) => {
        if (cancelled) return;
        const sorted = [...data.questions].sort((a, b) => a.id - b.id);
        setState({ loading: false, error: null, questions: sorted });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setState({ loading: false, error: err.message, questions: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
