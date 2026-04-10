import { useState, type FormEvent } from 'react';

interface Props {
  initialName: string;
  onSubmit: (name: string) => void;
}

export function NamePage({ initialName, onSubmit }: Props) {
  const [value, setValue] = useState(initialName);
  const trimmed = value.trim();
  const valid = trimmed.length >= 2;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onSubmit(trimmed);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-[100dvh] flex-col px-6 py-10 animate-fade-in"
    >
      <div className="mb-10">
        <div className="text-xs font-semibold uppercase tracking-widest text-eas-pink">
          Pregunta 0
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <label htmlFor="name" className="mb-6 text-3xl font-bold leading-tight">
          ¿Cómo te llamas?
        </label>
        <input
          id="name"
          autoFocus
          type="text"
          inputMode="text"
          autoComplete="name"
          autoCapitalize="words"
          placeholder="Nombre y apellido"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={60}
          className="w-full rounded-2xl bg-white/5 px-5 py-4 text-xl text-eas-cream placeholder:text-eas-cream/30 outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-eas-pink"
        />
      </div>

      <button type="submit" disabled={!valid} className="btn-primary w-full">
        Continuar
      </button>
    </form>
  );
}
