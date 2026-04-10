import type { Question } from '../../lib/types';
import { ProgressBar } from '../../components/ProgressBar';

interface Props {
  questions: Question[]; // only choice questions, in order
  currentIndex: number;
  onAnswer: (questionId: number, optionIndex: number) => void;
}

export function QuizPage({ questions, currentIndex, onAnswer }: Props) {
  const question = questions[currentIndex];
  if (!question) return null;

  const isBinary = question.options.length === 2;

  return (
    <div className="flex min-h-[100dvh] flex-col px-6 pb-8 pt-10">
      <div className="mb-8">
        <ProgressBar current={currentIndex} total={questions.length} />
      </div>

      <div key={question.id} className="flex flex-1 flex-col animate-fade-in">
        <h2 className="mb-8 text-2xl font-bold leading-snug sm:text-3xl">
          {question.text}
        </h2>

        <div className={isBinary ? 'flex flex-col gap-3' : 'grid grid-cols-1 gap-3'}>
          {question.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => onAnswer(question.id, idx)}
              className="group flex w-full items-center gap-4 rounded-2xl bg-eas-ink/70 px-5 py-5 text-left text-base font-medium ring-1 ring-white/10 transition hover:bg-eas-ink hover:ring-eas-pink/60 active:scale-[0.98]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-eas-pink/15 text-sm font-bold text-eas-pink">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
