import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
}))

vi.mock('@services/auth', () => ({
  signInWithEmail: authMocks.signInWithEmail,
  signUpWithEmail: authMocks.signUpWithEmail,
}))

import LoginPage from './LoginPage'

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('valida correo obligatorio', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Contraseña'), '123456')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(screen.getByText('Ingresa un correo electrónico válido.')).toBeInTheDocument()
    })
  })

  it('valida longitud minima de contraseña', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Correo electrónico'), 'demo@correo.com')
    await user.type(screen.getByLabelText('Contraseña'), '123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('La contraseña debe tener al menos 6 caracteres.')).toBeInTheDocument()
  })

  it('inicia sesion con credenciales validas', async () => {
    const user = userEvent.setup()
    authMocks.signInWithEmail.mockResolvedValueOnce({ session: { access_token: 'abc' } })
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Correo electrónico'), '  demo@correo.com  ')
    await user.type(screen.getByLabelText('Contraseña'), '123456')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(authMocks.signInWithEmail).toHaveBeenCalledWith('demo@correo.com', '123456')
    })
    expect(screen.getByText('Inicio de sesión exitoso. Ya puedes continuar al dashboard.')).toBeInTheDocument()
  })

  it('muestra error de autenticacion en inicio de sesion', async () => {
    const user = userEvent.setup()
    authMocks.signInWithEmail.mockRejectedValueOnce(new Error('credenciales invalidas'))
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Correo electrónico'), 'demo@correo.com')
    await user.type(screen.getByLabelText('Contraseña'), '123456')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(screen.getByText('credenciales invalidas')).toBeInTheDocument()
    })
  })

  it('crea cuenta y solicita confirmacion por correo cuando no hay sesion', async () => {
    const user = userEvent.setup()
    authMocks.signUpWithEmail.mockResolvedValueOnce({ session: null })
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    await user.type(screen.getByLabelText('Correo electrónico'), 'nuevo@correo.com')
    await user.type(screen.getByLabelText('Contraseña'), '123456')
    await user.click(screen.getAllByRole('button', { name: 'Crear cuenta' })[1])

    await waitFor(() => {
      expect(authMocks.signUpWithEmail).toHaveBeenCalledWith('nuevo@correo.com', '123456')
    })
    expect(screen.getByText('Cuenta creada. Revisa tu correo para confirmar tu cuenta.')).toBeInTheDocument()
  })

  it('crea cuenta con inicio de sesion inmediato cuando Supabase retorna session', async () => {
    const user = userEvent.setup()
    authMocks.signUpWithEmail.mockResolvedValueOnce({ session: { access_token: 'token' } })
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    await user.type(screen.getByLabelText('Correo electrónico'), 'nuevo2@correo.com')
    await user.type(screen.getByLabelText('Contraseña'), '123456')
    await user.click(screen.getAllByRole('button', { name: 'Crear cuenta' })[1])

    await waitFor(() => {
      expect(screen.getByText('Cuenta creada e inicio de sesión realizado correctamente.')).toBeInTheDocument()
    })
  })
})
