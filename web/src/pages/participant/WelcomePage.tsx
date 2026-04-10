interface Props {
  onStart: () => void;
}

export function WelcomePage({ onStart }: Props) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-between px-6 py-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center animate-fade-in">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-eas-cream/70 ring-1 ring-white/10">
          Encuentro Anual SinOficina · 2026
        </div>
        <h1 className="mb-3 text-6xl font-black tracking-tight text-eas-cream">
          Quiz<span className="text-eas-pink">EAS</span>
        </h1>
        <p className="mb-10 max-w-xs text-lg font-semibold text-eas-cream/90">
          10 preguntas. ¿1 perfil ganador?
        </p>

        <ul className="mb-12 space-y-3 text-left text-sm text-eas-cream/80">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-eas-pink">●</span>
            <span>
              Es <strong className="font-bold text-eas-cream">MUY</strong> importante que
              respondas con total honestidad
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-eas-pink">●</span>
            <span>No te precipites: el tiempo no importa</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-eas-pink">●</span>
            <span>Sigue las preguntas al ritmo de la presentación</span>
          </li>
        </ul>
      </div>

      <button onClick={onStart} className="btn-primary w-full max-w-sm">
        Empezar
      </button>
    </div>
  );
}
