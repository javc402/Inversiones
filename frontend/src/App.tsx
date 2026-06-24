import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@lib/supabase';
import { signOut } from '@services/auth';
import { getCurrentUserRole, Role } from '@services/roles';

const DashboardPage = lazy(() => import('@pages/DashboardPage'));
const LoginPage = lazy(() => import('@pages/LoginPage'));

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveRole(activeSession: Session | null): Promise<Role | null> {
      if (!activeSession) return null;

      try {
        return await getCurrentUserRole();
      } catch {
        return null;
      }
    }

    async function loadSession() {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();

      const resolvedRole = await resolveRole(activeSession);

      if (isMounted) {
        currentUserIdRef.current = activeSession?.user?.id ?? null;
        setSession(activeSession);
        setUserRole(resolvedRole);
        setIsLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user?.id ?? null;
      const hasUserChanged = nextUserId !== currentUserIdRef.current;

      // Solo actualizar si cambió el usuario realmente (evita re-renders por reconnects)
      if (!hasUserChanged) {
        return;
      }

      currentUserIdRef.current = nextUserId;
      setIsLoading(true);

      void (async () => {
        const resolvedRole = await resolveRole(nextSession);

        if (isMounted) {
          setSession(nextSession);
          setUserRole(resolvedRole);
          setIsLoading(false);
        }
      })();
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
      <DashboardPage
        userEmail={session.user.email ?? 'Usuario'}
        initialRole={userRole}
        onSignOut={signOut}
      />
    </Suspense>
  );
}

export default App;
