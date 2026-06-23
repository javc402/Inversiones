import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@lib/supabase';
import { signOut } from '@services/auth';
import DashboardPage from '@pages/DashboardPage';
import LoginPage from '@pages/LoginPage';

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
    return <LoginPage />;
  }

  return <DashboardPage userEmail={session.user.email ?? 'Usuario'} onSignOut={signOut} />;
}

export default App;
