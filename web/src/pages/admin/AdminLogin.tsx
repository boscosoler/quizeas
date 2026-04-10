import { useState, type FormEvent } from 'react';
import { verifyAndStorePassword, type AdminResults } from '../../api/admin';

interface Props {
  onAuthenticated: (initial: AdminResults) => void;
}

export function AdminLogin({ onAuthenticated }: Props) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const results = await verifyAndStorePassword(password);
      onAuthenticated(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación');
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-6 py-10">
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-sm p-8 animate-fade-in"
      >
        <div className="mb-8 text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-eas-cream/60 ring-1 ring-white/10">
            Panel de administración
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            Quiz<span className="text-eas-pink">EAS</span>
          </h1>
        </div>

        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-eas-cream/80">
          Contraseña
        </label>
        <input
          id="password"
          autoFocus
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="w-full rounded-2xl bg-white/5 px-5 py-4 text-lg text-eas-cream placeholder:text-eas-cream/30 outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-eas-pink disabled:opacity-50"
        />

        {error && (
          <p className="mt-3 text-sm text-red-400">
            {error === 'Unauthorized'
              ? 'Contraseña incorrecta'
              : error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="btn-primary mt-6 w-full"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
