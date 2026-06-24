import { Suspense, lazy, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@lib/supabase';
import { signOut } from '@services/auth';

const DashboardPage = lazy(() => import('@pages/DashboardPage'));
const LoginPage = lazy(() => import('@pages/LoginPage'));

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setSession(activeSession);
        setIsLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <main className="auth-layout">
        <section className="auth-panel">
          <p className="auth-subtitle">Cargando sesion...</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <Suspense
        fallback={
          <main className="auth-layout">
            <section className="auth-panel">
              <p className="auth-subtitle">Cargando pagina...</p>
            </section>
          </main>
        }
      >
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <Suspense
      fallback={
        <main className="auth-layout">
          <section className="auth-panel">
            <p className="auth-subtitle">Cargando dashboard...</p>
          </section>
        </main>
      }
    >
      <DashboardPage userEmail={session.user.email ?? 'Usuario'} onSignOut={signOut} />
    </Suspense>
  );
}

export default App;
