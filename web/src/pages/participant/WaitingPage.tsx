interface Props {
  name: string;
  total: number;
}

export function WaitingPage({ name, total }: Props) {
  const firstName = name.split(/\s+/)[0] ?? name;
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10 text-center animate-fade-in">
      <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-eas-pink/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-eas-pink ring-1 ring-eas-pink/30">
        ¡Bien hecho, {firstName}!
      </div>

      <div className="mb-10">
        <div className="text-sm font-medium text-eas-cream/60">Tu puntuación</div>
        <div className="mt-1 text-7xl font-black tracking-tight">
          <span className="text-eas-pink">{total}</span>
          <span className="text-eas-cream/40">/{total}</span>
        </div>
      </div>

      <div className="mb-6">
        <Spinner />
      </div>

      <h1 className="mb-3 text-2xl font-bold leading-tight">
        Buscando tu match perfecto…
      </h1>
      <p className="max-w-xs text-sm text-eas-cream/60">
        Espera en esta pantalla. En breve descubrirás con qué asistente al evento tienes
        más en común 💘
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="relative h-20 w-20">
      <div className="absolute inset-0 rounded-full border-4 border-white/10" />
      <div className="absolute inset-0 animate-spin-slow rounded-full border-4 border-transparent border-t-eas-pink border-r-eas-pink/60" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl">✨</span>
      </div>
    </div>
  );
}
