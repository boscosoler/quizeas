import { useEffect, useState } from 'react';
import {
  AuthError,
  fetchAdminResults,
  getStoredPassword,
  type AdminResults,
} from '../../api/admin';
import { AdminDashboard } from './AdminDashboard';
import { AdminLogin } from './AdminLogin';

type State =
  | { kind: 'checking' }
  | { kind: 'login' }
  | { kind: 'dashboard'; results: AdminResults };

export function AdminApp() {
  const [state, setState] = useState<State>(() =>
    getStoredPassword() ? { kind: 'checking' } : { kind: 'login' }
  );

  // If we have a stored password, validate it by fetching results.
  useEffect(() => {
    if (state.kind !== 'checking') return;
    let cancelled = false;
    (async () => {
      try {
        const results = await fetchAdminResults();
        if (cancelled) return;
        setState({ kind: 'dashboard', results });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthError) {
          setState({ kind: 'login' });
        } else {
          // Network / unexpected — show login with an implicit retry path.
          console.error(err);
          setState({ kind: 'login' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.kind]);

  if (state.kind === 'checking') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-eas-cream/50">
        Cargando…
      </div>
    );
  }

  if (state.kind === 'login') {
    return (
      <AdminLogin
        onAuthenticated={(results) => setState({ kind: 'dashboard', results })}
      />
    );
  }

  return (
    <AdminDashboard
      initialResults={state.results}
      onSignOut={() => setState({ kind: 'login' })}
    />
  );
}
