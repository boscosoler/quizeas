import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AuthError,
  clearPassword,
  downloadCsv,
  generateMatches,
  resetAll,
  type AdminPair,
  type AdminResults,
} from '../../api/admin';
import { fetchStatus, type Status } from '../../api/client';

interface Props {
  initialResults: AdminResults;
  onSignOut: () => void;
}

const STATUS_POLL_MS = 3000;

export function AdminDashboard({ initialResults, onSignOut }: Props) {
  const [results, setResults] = useState<AdminResults>(initialResults);
  const [status, setStatus] = useState<Status>({
    completed: initialResults.participants.length,
    matchesGenerated: initialResults.pairs.length > 0,
  });
  const [generating, setGenerating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof AuthError) {
        clearPassword();
        onSignOut();
        return true;
      }
      return false;
    },
    [onSignOut]
  );

  // Live count: poll /api/status every few seconds.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    let timer: number | undefined;

    async function tick() {
      try {
        const s = await fetchStatus();
        if (!mounted.current) return;
        setStatus(s);
      } catch (err) {
        console.warn('status poll failed', err);
      }
      if (mounted.current) {
        timer = window.setTimeout(tick, STATUS_POLL_MS);
      }
    }
    tick();

    return () => {
      mounted.current = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  async function handleGenerate() {
    if (generating) return;
    if (status.completed < 2) {
      setError('Necesitas al menos 2 participantes para generar matches.');
      return;
    }
    if (
      results.pairs.length > 0 &&
      !confirm(
        '¿Regenerar matches? Se descartarán los actuales y se recalcularán todos los emparejamientos.'
      )
    ) {
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      // The worker hands back the fresh pairs+participants in the POST
      // response, so we update local state directly instead of doing a
      // follow-up GET (KV.list is eventually consistent and was coming
      // back empty for a while after the writes).
      const fresh = await generateMatches();
      setResults({ participants: fresh.participants, pairs: fresh.pairs });
      setStatus((s) => ({ ...s, matchesGenerated: true }));
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err instanceof Error ? err.message : 'Error al generar matches');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadCsv() {
    if (downloading) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadCsv();
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err instanceof Error ? err.message : 'Error al descargar CSV');
    } finally {
      setDownloading(false);
    }
  }

  async function handleReset() {
    if (resetting) return;
    if (
      !confirm(
        '¿Borrar TODOS los datos (participantes, pairs, matches)? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }
    setResetting(true);
    setError(null);
    try {
      await resetAll();
      setResults({ participants: [], pairs: [] });
      setStatus({ completed: 0, matchesGenerated: false });
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err instanceof Error ? err.message : 'Error al resetear');
    } finally {
      setResetting(false);
    }
  }

  function handleLogout() {
    clearPassword();
    onSignOut();
  }

  const canGenerate = status.completed >= 2 && !generating;

  return (
    <div className="min-h-[100dvh] w-full">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        {/* Header */}
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-eas-cream/60 ring-1 ring-white/10">
              Panel de administración
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Quiz<span className="text-eas-pink">EAS</span>
              <span className="ml-3 text-lg font-normal text-eas-cream/40">
                / admin
              </span>
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-eas-cream/70 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-eas-cream"
          >
            Salir
          </button>
        </header>

        {/* Stats + primary CTA */}
        <section className="mb-10 grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="card flex items-center gap-5 p-6">
            <div className="relative h-3 w-3 shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-green-500/60" />
              <span className="relative block h-3 w-3 rounded-full bg-green-500" />
            </div>
            <div>
              <div className="text-5xl font-black tracking-tight tabular-nums text-eas-cream">
                {status.completed}
              </div>
              <div className="text-sm text-eas-cream/60">
                participantes han completado el quiz
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="btn-primary min-w-[220px] px-8 py-6 text-xl"
          >
            {generating
              ? 'Generando…'
              : results.pairs.length > 0
                ? 'Regenerar matches'
                : 'Generar matches'}
          </button>
        </section>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-600/90 p-4 text-sm text-white">
            <div className="font-semibold">Ha habido un error</div>
            <div className="mt-1 text-white/90">{error}</div>
          </div>
        )}

        {generating && (
          <div className="mb-6 rounded-2xl bg-eas-pink/10 p-4 text-sm text-eas-cream ring-1 ring-eas-pink/30">
            Generando matches y pidiendo razones a Claude. Puede tardar entre 10 y 30
            segundos dependiendo del número de participantes.
          </div>
        )}

        {/* Results table */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold">Resultados</h2>
              <p className="text-sm text-eas-cream/50">
                {results.pairs.length === 0
                  ? 'Aún no hay matches generados.'
                  : `${results.pairs.length} ${results.pairs.length === 1 ? 'emparejamiento' : 'emparejamientos'}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadCsv}
                disabled={downloading || results.pairs.length === 0}
                className="rounded-xl bg-white/5 px-4 py-2 text-xs font-semibold text-eas-cream/90 ring-1 ring-white/10 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {downloading ? 'Descargando…' : 'Descargar CSV'}
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="rounded-xl bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 ring-1 ring-red-500/30 transition hover:bg-red-500/20 disabled:opacity-40"
              >
                {resetting ? 'Borrando…' : 'Reset'}
              </button>
            </div>
          </div>

          {results.pairs.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-2 p-10 text-center">
              <div className="text-3xl">🤝</div>
              <p className="text-sm text-eas-cream/60">
                Cuando pulses <strong className="text-eas-cream">Generar matches</strong>{' '}
                aparecerán aquí los emparejamientos.
              </p>
            </div>
          ) : (
            <ResultsTable pairs={results.pairs} />
          )}
        </section>
      </div>
    </div>
  );
}

function ResultsTable({ pairs }: { pairs: AdminPair[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-eas-cream/50">
            <tr>
              <th className="px-5 py-3 font-semibold">Participante A</th>
              <th className="px-5 py-3 font-semibold">Participante B</th>
              <th className="px-5 py-3 font-semibold">%</th>
              <th className="px-5 py-3 font-semibold">Razón</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pairs.map((pair) => {
              const [a, b, c] = pair.members;
              const bLabel = c ? `${b?.name ?? '—'} + ${c.name}` : (b?.name ?? '—');
              return (
                <tr key={pair.id} className="align-top hover:bg-white/[0.02]">
                  <td className="px-5 py-4 font-semibold text-eas-cream">
                    {a?.name ?? '—'}
                    {pair.type === 'trio' && (
                      <span className="ml-2 rounded-full bg-eas-pink/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-eas-pink">
                        trío
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-semibold text-eas-cream">{bLabel}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex min-w-[48px] justify-center rounded-lg bg-eas-pink/15 px-2 py-1 text-sm font-bold tabular-nums text-eas-pink">
                      {pair.percentage}%
                    </span>
                  </td>
                  <td className="max-w-[480px] px-5 py-4 text-eas-cream/80">
                    {pair.reason}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
