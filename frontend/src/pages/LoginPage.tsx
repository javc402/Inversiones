import { FormEvent, useState } from 'react';
import { signInWithEmail, signUpWithEmail } from '@services/auth';

type AuthMode = 'signin' | 'signup';

const MIN_PASSWORD_LENGTH = 6;

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isSignIn = mode === 'signin';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    setLoading(true);

    try {
      if (isSignIn) {
        await signInWithEmail(email.trim(), password);
        setSuccess('Inicio de sesión exitoso. Ya puedes continuar al dashboard.');
      } else {
        const result = await signUpWithEmail(email.trim(), password);
        const needsEmailConfirmation = !result.session;

        if (needsEmailConfirmation) {
          setSuccess('Cuenta creada. Revisa tu correo para confirmar tu cuenta.');
        } else {
          setSuccess('Cuenta creada e inicio de sesión realizado correctamente.');
        }
      }
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'No fue posible autenticar en este momento.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <h1 className="auth-title">Inversiones</h1>
        <p className="auth-subtitle">Acceso al sistema con Supabase Auth</p>

        <div className="auth-mode-switch" role="tablist" aria-label="Modo de autenticación">
          <button
            type="button"
            className={`auth-mode-btn ${isSignIn ? 'active' : ''}`}
            onClick={() => setMode('signin')}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={`auth-mode-btn ${!isSignIn ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Crear cuenta
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Procesando...' : isSignIn ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <button type="button" className="google-btn" disabled title="Función temporalmente inactiva">
          Continuar con Google (inactivo)
        </button>

        {error && <p className="auth-message error">{error}</p>}
        {success && <p className="auth-message success">{success}</p>}
      </section>
    </main>
  );
}
