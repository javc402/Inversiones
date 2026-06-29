import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const appMocks = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  unsubscribeMock: vi.fn(),
  signOutMock: vi.fn().mockResolvedValue(undefined),
  getCurrentUserRoleMock: vi.fn(),
}))
let authStateCallback: ((event: string, session: any) => void) | undefined

vi.mock('@lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: appMocks.getSessionMock,
      onAuthStateChange: appMocks.onAuthStateChangeMock,
    },
  },
}))

vi.mock('@services/auth', () => ({
  signOut: appMocks.signOutMock,
}))

vi.mock('@services/roles', () => ({
  getCurrentUserRole: appMocks.getCurrentUserRoleMock,
}))

vi.mock('@pages/LoginPage', () => ({
  default: () => <div>LOGIN_VIEW</div>,
}))

vi.mock('@pages/DashboardPage', () => ({
  default: ({ userEmail, onSignOut }: { userEmail: string; onSignOut: () => Promise<void> }) => (
    <div>
      <span>DASHBOARD_VIEW:{userEmail}</span>
      <button type="button" onClick={() => void onSignOut()}>
        Trigger sign out
      </button>
    </div>
  ),
}))

import App from './App'

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStateCallback = undefined
    appMocks.getCurrentUserRoleMock.mockResolvedValue(null)
    appMocks.onAuthStateChangeMock.mockImplementation((callback: (event: string, session: any) => void) => {
      authStateCallback = callback
      return { data: { subscription: { unsubscribe: appMocks.unsubscribeMock } } }
    })
  })

  afterEach(() => {
    appMocks.unsubscribeMock.mockClear()
  })

  it('muestra loading mientras consulta la sesion inicial', async () => {
    appMocks.getSessionMock.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 50))
    )

    render(<App />)

    expect(screen.getByText('Cargando sesion...')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('LOGIN_VIEW')).toBeInTheDocument()
    })
  })

  it('muestra login cuando no hay sesion', async () => {
    appMocks.getSessionMock.mockResolvedValueOnce({ data: { session: null } })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('LOGIN_VIEW')).toBeInTheDocument()
    })
  })

  it('muestra dashboard cuando existe sesion con email', async () => {
    appMocks.getSessionMock.mockResolvedValueOnce({ data: { session: { user: { email: 'demo@correo.com' } } } })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('DASHBOARD_VIEW:demo@correo.com')).toBeInTheDocument()
    })
  })

  it('usa fallback Usuario cuando la sesion no trae email', async () => {
    appMocks.getSessionMock.mockResolvedValueOnce({ data: { session: { user: { email: null } } } })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('DASHBOARD_VIEW:Usuario')).toBeInTheDocument()
    })
  })

  it('actualiza la vista al recibir cambios de auth', async () => {
    appMocks.getSessionMock.mockResolvedValueOnce({ data: { session: null } })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('LOGIN_VIEW')).toBeInTheDocument()
    })

    authStateCallback?.('SIGNED_IN', { user: { id: 'user-123', email: 'live@correo.com' } })

    await waitFor(() => {
      expect(screen.getByText('DASHBOARD_VIEW:live@correo.com')).toBeInTheDocument()
    })
  })

  it('ignora evento auth cuando el usuario no cambió', async () => {
    appMocks.getSessionMock.mockResolvedValueOnce({ data: { session: { user: { id: 'user-1', email: 'same@correo.com' } } } })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('DASHBOARD_VIEW:same@correo.com')).toBeInTheDocument()
    })

    authStateCallback?.('TOKEN_REFRESHED', { user: { id: 'user-1', email: 'changed@correo.com' } })

    await waitFor(() => {
      expect(screen.getByText('DASHBOARD_VIEW:same@correo.com')).toBeInTheDocument()
    })
    expect(screen.queryByText('DASHBOARD_VIEW:changed@correo.com')).not.toBeInTheDocument()
  })

  it('si falla resolver rol mantiene la sesión', async () => {
    appMocks.getCurrentUserRoleMock.mockRejectedValueOnce(new Error('role fail'))
    appMocks.getSessionMock.mockResolvedValueOnce({ data: { session: { user: { id: 'user-1', email: 'demo@correo.com' } } } })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('DASHBOARD_VIEW:demo@correo.com')).toBeInTheDocument()
    })
  })

  it('desuscribe el listener al desmontar', async () => {
    appMocks.getSessionMock.mockResolvedValueOnce({ data: { session: null } })

    const { unmount } = render(<App />)

    await waitFor(() => {
      expect(screen.getByText('LOGIN_VIEW')).toBeInTheDocument()
    })

    unmount()

    expect(appMocks.unsubscribeMock).toHaveBeenCalledTimes(1)
  })

  it('propaga onSignOut al dashboard', async () => {
    appMocks.getSessionMock.mockResolvedValueOnce({ data: { session: { user: { email: 'demo@correo.com' } } } })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('DASHBOARD_VIEW:demo@correo.com')).toBeInTheDocument()
    })

    screen.getByRole('button', { name: 'Trigger sign out' }).click()

    await waitFor(() => {
      expect(appMocks.signOutMock).toHaveBeenCalledTimes(1)
    })
  })
})
