import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import DashboardPage from './DashboardPage'

const getCurrentUserRoleMock = vi.hoisted(() => vi.fn())
const listTradingAccountsMock = vi.hoisted(() => vi.fn())
const listMarketEntriesByUserMock = vi.hoisted(() => vi.fn())

vi.mock('@components/AdminPanel', () => ({
  default: () => React.createElement('div', null, 'Panel de Administración'),
}))

vi.mock('@components/AccountsModule', () => ({
  default: () => React.createElement('div', null, 'Modulo de Cuentas'),
}))

vi.mock('@components/SettingsModule', () => ({
  default: () => React.createElement('div', null, 'Modulo de Configuracion'),
}))

vi.mock('@components/NewsModule', () => ({
  default: () => React.createElement('div', null, 'Modulo de Noticias'),
}))

vi.mock('@components/MarketEntriesModule', () => ({
  default: () => React.createElement('div', null, 'Modulo de Entradas'),
}))

vi.mock('@services/roles', () => ({
  getCurrentUserRole: getCurrentUserRoleMock,
}))

vi.mock('@services/accounts', () => ({
  listTradingAccounts: listTradingAccountsMock,
}))

vi.mock('@services/market-entries', () => ({
  listMarketEntriesByUser: listMarketEntriesByUserMock,
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
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    listTradingAccountsMock.mockResolvedValue([])
    listMarketEntriesByUserMock.mockResolvedValue([])
  })

  it('muestra menu de gestionar usuarios solo para admin', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-admin',
      name: 'admin',
      description: 'Administrador',
    })

    render(<DashboardPage userEmail="admin@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByRole('button', { name: 'Gestionar usuarios' })).toBeInTheDocument()
  })

  it('oculta menu de gestionar usuarios para usuario no admin', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByRole('button', { name: 'Gestionar cuentas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gestionar usuarios' })).not.toBeInTheDocument()
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

    expect(await screen.findByText('Modulo de Cuentas')).toBeInTheDocument()
  })

  it('muestra informacion principal y email del usuario', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Cuenta Real',
        alias: 'Real',
      },
    ])
    listMarketEntriesByUserMock.mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.0,
        takeProfit: 1.2,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: 1,
        note: '',
        status: 'closed',
        plannedAt: '2026-06-20T10:00:00.000Z',
        createdAt: '2026-06-20T10:00:00.000Z',
        updatedAt: '2026-06-20T10:00:00.000Z',
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-admin',
      name: 'admin',
      description: 'Administrador',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(screen.getByText('Inversiones')).toBeInTheDocument()
    expect(screen.getByText('usuario@demo.com')).toBeInTheDocument()
    expect(screen.getByText('Ganancia del mes')).toBeInTheDocument()
    expect(screen.getByText('Operaciones recientes')).toBeInTheDocument()
    expect(await screen.findByText('EURUSD')).toBeInTheDocument()
  })

  it('muestra panel de administracion para admin', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-admin',
      name: 'admin',
      description: 'Administrador',
    })

    render(<DashboardPage userEmail="admin@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Gestionar usuarios' }))

    expect(await screen.findByText('Panel de Administración')).toBeInTheDocument()
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

  it('oculta menu de usuarios cuando el rol no es admin', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="user@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByRole('button', { name: 'Gestionar cuentas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gestionar usuarios' })).not.toBeInTheDocument()
  })

  it('oculta menu de usuarios si falla la carga del rol', async () => {
    getCurrentUserRoleMock.mockRejectedValueOnce(new Error('role fetch failed'))

    render(<DashboardPage userEmail="user@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByRole('button', { name: 'Gestionar cuentas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gestionar usuarios' })).not.toBeInTheDocument()
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

  it('filtra operaciones por cuenta desde el combo superior', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Cuenta Real',
        alias: 'Real',
      },
      {
        id: 'acc-2',
        name: 'Cuenta Demo',
        alias: 'Demo',
      },
    ])
    listMarketEntriesByUserMock.mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.0,
        takeProfit: 1.2,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        note: '',
        status: 'open',
        plannedAt: '2026-06-20T10:00:00.000Z',
        createdAt: '2026-06-20T10:00:00.000Z',
        updatedAt: '2026-06-20T10:00:00.000Z',
      },
      {
        id: 'entry-2',
        groupId: 'group-2',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-2',
        accountName: 'Demo',
        symbol: 'GBPUSD',
        marketContext: 'NFP',
        setup: 'Pullback',
        session: 'LONDON',
        direction: 'sell',
        entryPrice: 1.3,
        stopLoss: 1.31,
        takeProfit: 1.28,
        riskAmount: 60,
        investmentPercent: 0.8,
        resultR: null,
        note: '',
        status: 'planned',
        plannedAt: '2026-06-21T10:00:00.000Z',
        createdAt: '2026-06-21T10:00:00.000Z',
        updatedAt: '2026-06-21T10:00:00.000Z',
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByLabelText('Filtrar por cuenta')).toBeInTheDocument()
    expect(await screen.findByText('EURUSD')).toBeInTheDocument()
    expect(screen.getByText('GBPUSD')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filtrar por cuenta'), { target: { value: 'acc-1' } })

    expect(screen.getByText('EURUSD')).toBeInTheDocument()
    expect(screen.queryByText('GBPUSD')).not.toBeInTheDocument()
  })
})
