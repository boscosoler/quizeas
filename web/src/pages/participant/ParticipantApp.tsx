import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchResults, submitAnswers, type MatchResult } from '../../api/client';
import { useQuestions } from '../../hooks/useQuestions';
import { getOrCreateSessionId } from '../../lib/session';
import { clearState, loadState, saveState } from '../../lib/storage';
import type { Answer, Step } from '../../lib/types';
import { MatchRevealPage } from './MatchRevealPage';
import { NamePage } from './NamePage';
import { QuizPage } from './QuizPage';
import { WaitingPage } from './WaitingPage';
import { WelcomePage } from './WelcomePage';

type ReadyMatch = Extract<MatchResult, { ready: true }>;

export function ParticipantApp() {
  const { loading, error, questions } = useQuestions();

  // Session id is created once and persisted in sessionStorage.
  const sessionIdRef = useRef<string>('');
  if (sessionIdRef.current === '') sessionIdRef.current = getOrCreateSessionId();

  const persisted = useMemo(() => loadState(), []);
  const [step, setStep] = useState<Step>(persisted?.step ?? 'welcome');
  const [name, setName] = useState<string>(persisted?.name ?? '');
  const [currentIndex, setCurrentIndex] = useState<number>(persisted?.currentIndex ?? 0);
  const [answers, setAnswers] = useState<Answer[]>(persisted?.answers ?? []);
  const [match, setMatch] = useState<ReadyMatch | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Persist state on every change.
  useEffect(() => {
    saveState({ step, name, currentIndex, answers });
  }, [step, name, currentIndex, answers]);

  const choiceQuestions = useMemo(
    () => questions.filter((q) => q.type === 'choice'),
    [questions]
  );

  // Poll for the match result while on waiting. Backs off gracefully.
  useEffect(() => {
    if (step !== 'waiting') return;
    let cancelled = false;
    let timer: number | undefined;

    async function tick() {
      if (cancelled) return;
      try {
        const result = await fetchResults(sessionIdRef.current);
        if (cancelled) return;
        if (result.ready) {
          setMatch(result);
          setStep('match');
          return;
        }
      } catch (err) {
        console.warn('results poll failed', err);
      }
      timer = window.setTimeout(tick, 2500);
    }

    // First poll immediately, then every 2.5s.
    tick();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [step]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-eas-cream/60">
        Cargando…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-2 text-3xl">😬</div>
        <h1 className="mb-2 text-xl font-bold">No se han podido cargar las preguntas</h1>
        <p className="text-sm text-eas-cream/60">{error}</p>
      </div>
    );
  }

  function handleStart() {
    setStep('name');
  }

  function handleNameSubmit(submitted: string) {
    setName(submitted);
    setCurrentIndex(0);
    setAnswers([]);
    setMatch(null);
    setStep('quiz');
  }

  async function finalize(finalAnswers: Answer[], finalName: string) {
    setSubmitError(null);
    try {
      await submitAnswers({
        sessionId: sessionIdRef.current,
        name: finalName,
        answers: finalAnswers,
      });
    } catch (err) {
      console.error(err);
      setSubmitError(
        err instanceof Error ? err.message : 'No se pudo enviar tus respuestas'
      );
    }
  }

  function handleAnswer(questionId: number, optionIndex: number) {
    const updated = (() => {
      const without = answers.filter((a) => a.questionId !== questionId);
      return [...without, { questionId, optionIndex, value: null }];
    })();
    setAnswers(updated);

    const next = currentIndex + 1;
    if (next >= choiceQuestions.length) {
      setStep('waiting');
      void finalize(updated, name);
    } else {
      setCurrentIndex(next);
    }
  }

  function handleReset() {
    clearState();
    setStep('welcome');
    setName('');
    setCurrentIndex(0);
    setAnswers([]);
    setMatch(null);
    setSubmitError(null);
  }

  function handleRetrySubmit() {
    void finalize(answers, name);
  }

  return (
    <div className="relative mx-auto min-h-[100dvh] max-w-md">
      {step === 'welcome' && <WelcomePage onStart={handleStart} />}
      {step === 'name' && <NamePage initialName={name} onSubmit={handleNameSubmit} />}
      {step === 'quiz' && (
        <QuizPage
          questions={choiceQuestions}
          currentIndex={currentIndex}
          onAnswer={handleAnswer}
        />
      )}
      {step === 'waiting' && (
        <>
          <WaitingPage name={name} total={choiceQuestions.length} />
          {submitError && (
            <div className="fixed inset-x-4 bottom-16 mx-auto max-w-sm rounded-2xl bg-red-600/90 p-4 text-sm text-white shadow-xl">
              <div className="font-semibold">Error al enviar tus respuestas</div>
              <div className="mt-1 text-white/80">{submitError}</div>
              <button
                onClick={handleRetrySubmit}
                className="mt-3 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
              >
                Reintentar
              </button>
            </div>
          )}
        </>
      )}
      {step === 'match' && match && <MatchRevealPage match={match} />}

      {/* Dev reset: hidden tap target in the bottom-right corner */}
      <button
        onClick={handleReset}
        aria-label="Reset (dev)"
        className="fixed bottom-2 right-2 h-8 w-8 rounded-full text-[10px] text-eas-cream/20 hover:text-eas-cream/60"
        title="Reset"
      >
        ↺
      </button>
    </div>
  );
}
