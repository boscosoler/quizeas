import type { MatchResult } from '../../api/client';

interface Props {
  match: Extract<MatchResult, { ready: true }>;
}

export function MatchRevealPage({ match }: Props) {
  const isTrio = match.type === 'trio';
  const partnerNames = match.partners.map((p) => p.name);

  return (
    <div className="flex min-h-[100dvh] flex-col px-6 py-10 animate-fade-in">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-eas-pink/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-eas-pink ring-1 ring-eas-pink/30">
          {isTrio ? 'Tu match · trío' : 'Tu match'}
        </div>
      </div>

      <div className="mb-8 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-eas-cream/50">
          {isTrio ? 'Tus matches son' : 'Tu match es'}
        </p>
        <h1 className="text-4xl font-black leading-tight tracking-tight text-eas-cream sm:text-5xl">
          {partnerNames.map((n, i) => (
            <span key={i} className="block">
              {n}
            </span>
          ))}
        </h1>
      </div>

      <div className="mb-10 flex justify-center">
        <div className="relative">
          <div className="rounded-full bg-gradient-to-br from-eas-pink to-pink-700 p-1 shadow-2xl shadow-eas-pink/30">
            <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full bg-eas-dark">
              <div className="text-6xl font-black tracking-tight text-eas-pink">
                {match.percentage}
                <span className="text-3xl">%</span>
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-eas-cream/60">
                Compatibilidad
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -inset-3 -z-10 rounded-full bg-eas-pink/20 blur-3xl" />
        </div>
      </div>

      <div className="card mx-auto w-full max-w-sm p-6">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-eas-pink">
          Por qué hacéis match
        </div>
        <p className="text-base leading-relaxed text-eas-cream/90">{match.reason}</p>
      </div>

      <div className="mt-auto pt-10 text-center text-sm text-eas-cream/60">
        {isTrio
          ? `Busca a ${partnerNames.join(' y ')} por la sala 👀`
          : `Busca a ${partnerNames[0]} por la sala 👀`}
      </div>
    </div>
  );
}
