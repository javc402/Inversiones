import { describe, expect, it, vi, beforeEach } from 'vitest'

const authMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOutMock: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
      signOut: authMocks.signOutMock,
    },
    from: authMocks.from,
  },
}))

import { signInWithEmail, signOut, signUpWithEmail, createUserProfile } from './auth'

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
    const data = { session: null, user: { id: 'user-123' } }
    authMocks.signUp.mockResolvedValueOnce({ data, error: null })

    // Mock para createUserProfile
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: { id: 'role-1' },
      error: null,
    })
    const mockInsert = vi.fn().mockResolvedValueOnce({ error: null })

    authMocks.from
      .mockReturnValueOnce({
        select: mockSelect,
      })
      .mockReturnValueOnce({
        insert: mockInsert,
      })

    mockSelect.mockReturnValueOnce({
      eq: mockEq,
    })

    mockEq.mockReturnValueOnce({
      single: mockSingle,
    })

    const result = await signUpWithEmail('nuevo@correo.com', '123456')

    expect(authMocks.signUp).toHaveBeenCalledWith({ email: 'nuevo@correo.com', password: '123456' })
    expect(result).toEqual(data)
  })

  it('signUpWithEmail lanza error si Supabase falla', async () => {
    const error = new Error('no se pudo crear la cuenta')
    authMocks.signUp.mockResolvedValueOnce({ data: null, error })

    await expect(signUpWithEmail('nuevo@correo.com', '123456')).rejects.toThrow('no se pudo crear la cuenta')
  })

  it('signUpWithEmail no rompe si falla createUserProfile', async () => {
    const data = { session: null, user: { id: 'user-123' } }
    authMocks.signUp.mockResolvedValueOnce({ data, error: null })

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('role error') })

    authMocks.from.mockReturnValueOnce({ select: mockSelect })
    mockSelect.mockReturnValueOnce({ eq: mockEq })
    mockEq.mockReturnValueOnce({ single: mockSingle })

    await expect(signUpWithEmail('nuevo@correo.com', '123456')).resolves.toEqual(data)
  })

  it('signUpWithEmail retorna data si no hay user en respuesta', async () => {
    const data = { session: null, user: null }
    authMocks.signUp.mockResolvedValueOnce({ data, error: null })

    const result = await signUpWithEmail('nuevo@correo.com', '123456')

    expect(result).toEqual(data)
    expect(authMocks.from).not.toHaveBeenCalled()
  })

  it('createUserProfile crea perfil con rol user y estado pending', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: { id: 'role-1' },
      error: null,
    })
    const mockInsert = vi.fn().mockResolvedValueOnce({ error: null })

    authMocks.from
      .mockReturnValueOnce({
        select: mockSelect,
      })
      .mockReturnValueOnce({
        insert: mockInsert,
      })

    mockSelect.mockReturnValueOnce({
      eq: mockEq,
    })

    mockEq.mockReturnValueOnce({
      single: mockSingle,
    })

    await createUserProfile('user-123', 'user')

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-123',
      role_id: 'role-1',
      status: 'pending',
    })
  })

  it('createUserProfile lanza error si falla obtener rol', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('role fail') })

    authMocks.from.mockReturnValueOnce({ select: mockSelect })
    mockSelect.mockReturnValueOnce({ eq: mockEq })
    mockEq.mockReturnValueOnce({ single: mockSingle })

    await expect(createUserProfile('user-123', 'admin')).rejects.toThrow('role fail')
  })

  it('createUserProfile lanza error si falla insertar perfil', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValueOnce({ data: { id: 'role-1' }, error: null })
    const mockInsert = vi.fn().mockResolvedValueOnce({ error: new Error('insert fail') })

    authMocks.from
      .mockReturnValueOnce({ select: mockSelect })
      .mockReturnValueOnce({ insert: mockInsert })

    mockSelect.mockReturnValueOnce({ eq: mockEq })
    mockEq.mockReturnValueOnce({ single: mockSingle })

    await expect(createUserProfile('user-123', 'user')).rejects.toThrow('insert fail')
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
