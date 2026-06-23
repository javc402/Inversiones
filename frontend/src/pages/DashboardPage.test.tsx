import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import DashboardPage from './DashboardPage'

const getCurrentUserRoleMock = vi.hoisted(() => vi.fn())

vi.mock('@components/AdminPanel', () => ({
  default: () => React.createElement('div', null, 'Panel de Administración'),
}))

vi.mock('@components/AccountsModule', () => ({
  default: () => React.createElement('div', null, 'Modulo de Cuentas'),
}))

vi.mock('@services/roles', () => ({
  getCurrentUserRole: getCurrentUserRoleMock,
}))

vi.mock('recharts', () => {
  const Wrapper = ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children)
  return {
    ResponsiveContainer: Wrapper,
    AreaChart: Wrapper,
    PieChart: Wrapper,
    Pie: Wrapper,
    Area: Wrapper,
    Cell: Wrapper,
    CartesianGrid: Wrapper,
    Legend: Wrapper,
    Tooltip: Wrapper,
    XAxis: Wrapper,
    YAxis: Wrapper,
  }
})

describe('DashboardPage', () => {
  it('muestra menu de gestionar usuarios para cualquier rol', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByRole('button', { name: 'Gestionar usuarios' })).toBeInTheDocument()
  })

  it('muestra menu de gestionar cuentas para cualquier rol', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByRole('button', { name: 'Gestionar cuentas' })).toBeInTheDocument()
  })

  it('muestra modulo de cuentas al seleccionar Gestionar cuentas', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="user@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Gestionar cuentas' }))

    expect(screen.getByText('Modulo de Cuentas')).toBeInTheDocument()
  })

  it('muestra informacion principal y email del usuario', () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-admin',
      name: 'admin',
      description: 'Administrador',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(screen.getByText('Dashboard de Inversiones')).toBeInTheDocument()
    expect(screen.getByText('usuario@demo.com')).toBeInTheDocument()
    expect(screen.getByText('Ganancia del mes')).toBeInTheDocument()
    expect(screen.getByText('Operaciones recientes')).toBeInTheDocument()
    expect(screen.getByText('EURUSD')).toBeInTheDocument()
  })

  it('muestra panel de administracion para admin', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-admin',
      name: 'admin',
      description: 'Administrador',
    })

    render(<DashboardPage userEmail="admin@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Gestionar usuarios' }))

    expect(screen.getByText('Panel de Administración')).toBeInTheDocument()
  })

  it('permite volver a resumen desde gestionar usuarios', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-admin',
      name: 'admin',
      description: 'Administrador',
    })

    render(<DashboardPage userEmail="admin@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Gestionar usuarios' }))
    fireEvent.click(screen.getByRole('button', { name: 'Resumen' }))

    expect(screen.getByText('Operaciones recientes')).toBeInTheDocument()
  })

  it('muestra mensaje de acceso restringido para usuario no admin', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="user@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Gestionar usuarios' }))

    expect(
      screen.getByText('Esta seccion es solo para administradores. Solicita permisos de admin para gestionar usuarios.')
    ).toBeInTheDocument()
  })

  it('mantiene vista restringida si falla la carga del rol', async () => {
    getCurrentUserRoleMock.mockRejectedValueOnce(new Error('role fetch failed'))

    render(<DashboardPage userEmail="user@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Gestionar usuarios' }))

    expect(
      screen.getByText('Esta seccion es solo para administradores. Solicita permisos de admin para gestionar usuarios.')
    ).toBeInTheDocument()
  })

  it('ejecuta onSignOut al pulsar cerrar sesion', () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-admin',
      name: 'admin',
      description: 'Administrador',
    })

    const onSignOut = vi.fn().mockResolvedValue(undefined)
    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={onSignOut} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesion' }))

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
