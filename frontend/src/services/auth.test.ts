import { describe, expect, it, vi, beforeEach } from 'vitest'

const authMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOutMock: vi.fn(),
}))

vi.mock('@lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
      signOut: authMocks.signOutMock,
    },
  },
}))

import { signInWithEmail, signOut, signUpWithEmail } from './auth'

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signInWithEmail retorna data cuando no hay error', async () => {
    const data = { session: { access_token: 'token' } }
    authMocks.signInWithPassword.mockResolvedValueOnce({ data, error: null })

    const result = await signInWithEmail('demo@correo.com', '123456')

    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({ email: 'demo@correo.com', password: '123456' })
    expect(result).toEqual(data)
  })

  it('signInWithEmail lanza error si Supabase falla', async () => {
    const error = new Error('credenciales invalidas')
    authMocks.signInWithPassword.mockResolvedValueOnce({ data: null, error })

    await expect(signInWithEmail('demo@correo.com', 'bad-pass')).rejects.toThrow('credenciales invalidas')
  })

  it('signUpWithEmail retorna data cuando no hay error', async () => {
    const data = { session: null, user: { id: '1' } }
    authMocks.signUp.mockResolvedValueOnce({ data, error: null })

    const result = await signUpWithEmail('nuevo@correo.com', '123456')

    expect(authMocks.signUp).toHaveBeenCalledWith({ email: 'nuevo@correo.com', password: '123456' })
    expect(result).toEqual(data)
  })

  it('signUpWithEmail lanza error si Supabase falla', async () => {
    const error = new Error('no se pudo crear la cuenta')
    authMocks.signUp.mockResolvedValueOnce({ data: null, error })

    await expect(signUpWithEmail('nuevo@correo.com', '123456')).rejects.toThrow('no se pudo crear la cuenta')
  })

  it('signOut completa correctamente', async () => {
    authMocks.signOutMock.mockResolvedValueOnce({ error: null })

    await expect(signOut()).resolves.toBeUndefined()
    expect(authMocks.signOutMock).toHaveBeenCalledTimes(1)
  })

  it('signOut lanza error cuando falla', async () => {
    authMocks.signOutMock.mockResolvedValueOnce({ error: new Error('no se pudo cerrar sesion') })

    await expect(signOut()).rejects.toThrow('no se pudo cerrar sesion')
  })
})
