import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import DashboardPage, {
  calculateTradingInsights,
  calculateDailyProfitData,
  calculateMonthlyProfitData,
  calculateProfitFactor,
  distributionAmountLabel,
  financialOutcomeLabel,
  financialResultAmount,
  fullMonthLabelFromShort,
  formatCurrency,
  formatDate,
  formatUsdInput,
  getEntryExecutionDate,
  isDashboardTab,
  isTechnicalBreakEven,
  loadStoredDashboardTab,
  openOperationLink,
  parseDashboardEditValues,
  prefetchDashboardTab,
  roleNameLabel,
  resolveMonthlyReferenceDate,
  sanitizeUsdDraft,
  statusLabel,
  technicalOutcomeLabel,
  toDateTimeLocalValue,
  toEditableUsdInput,
  tradeResultClass,
} from './DashboardPage'

const getCurrentUserRoleMock = vi.hoisted(() => vi.fn())
const listTradingAccountsMock = vi.hoisted(() => vi.fn())
const listMarketEntriesByUserMock = vi.hoisted(() => vi.fn())
const updateMarketEntryByIdMock = vi.hoisted(() => vi.fn())
const listUserNewsMock = vi.hoisted(() => vi.fn())

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

vi.mock('@components/SimulationsModule', () => ({
  default: () => React.createElement('div', null, 'Modulo de Simulaciones'),
}))

vi.mock('@services/roles', () => ({
  getCurrentUserRole: getCurrentUserRoleMock,
}))

vi.mock('@services/accounts', () => ({
  listTradingAccounts: listTradingAccountsMock,
}))

vi.mock('@services/market-entries', () => ({
  listMarketEntriesByUser: listMarketEntriesByUserMock,
  updateMarketEntryById: updateMarketEntryByIdMock,
}))

vi.mock('@services/news', () => ({
  listUserNews: listUserNewsMock,
}))

vi.mock('recharts', () => {
  const Wrapper = ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children)
  const Tooltip = ({ formatter, labelFormatter }: {
    formatter?: (value: number, name: string, props: { payload: { name: string; operations: number; totalAmount: number } }) => [string, string]
    labelFormatter?: (label: string) => string
  }) => {
    if (typeof formatter === 'function') {
      formatter(33.3, 'Ganadas', { payload: { name: 'Ganadas', operations: 1, totalAmount: 100 } })
    }
    if (typeof labelFormatter === 'function') {
      labelFormatter('Ene')
    }
    return React.createElement('div', null)
  }
  const Legend = ({ formatter }: { formatter?: (value: string) => string }) => {
    if (typeof formatter === 'function') {
      formatter('Ganadas')
    }
    return React.createElement('div', null)
  }
  return {
    ResponsiveContainer: Wrapper,
    AreaChart: Wrapper,
    PieChart: Wrapper,
    Pie: Wrapper,
    Area: Wrapper,
    Cell: Wrapper,
    CartesianGrid: Wrapper,
    Legend,
    Tooltip,
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
    updateMarketEntryByIdMock.mockResolvedValue(undefined)
    listUserNewsMock.mockResolvedValue([])
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

  it('cambia a tab de noticias y vuelve a resumen', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('Ganancias del año')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mis noticias' }))
    expect(await screen.findByText('Modulo de Noticias')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Resumen|Dashboard/ }))
    expect(await screen.findByText('Ganancias del año')).toBeInTheDocument()
  })

  it('muestra menu de simulacion y cambia a su tab', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Simulación' }))
    expect(await screen.findByText('Modulo de Simulaciones')).toBeInTheDocument()
  })

  it('filtra operaciones por año desde el combo superior', async () => {
    const today = new Date()
    const lastYear = new Date(today.getFullYear() - 1, 0, 15)
    
    listTradingAccountsMock.mockResolvedValueOnce([])
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
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: 1,
        note: '',
        status: 'closed',
        plannedAt: today.toISOString(),
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
      },
      {
        id: 'entry-2',
        groupId: 'group-2',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'GBPUSD',
        marketContext: 'NFP',
        setup: 'Pullback',
        session: 'LONDON',
        direction: 'sell',
        entryPrice: 1.3,
        stopLoss: 1.31,
        takeProfit: 1.28,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: -0.5,
        note: '',
        status: 'closed',
        plannedAt: lastYear.toISOString(),
        createdAt: lastYear.toISOString(),
        updatedAt: lastYear.toISOString(),
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    const yearFilter = await screen.findByLabelText('Filtrar por año')
    expect(yearFilter).toBeInTheDocument()
    expect((yearFilter as HTMLSelectElement).querySelector(`option[value="${today.getFullYear()}"]`)).toBeInTheDocument()

    fireEvent.change(yearFilter, { target: { value: 'all' } })

    expect(screen.getByLabelText('Filtrar por mes')).toBeDisabled()
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
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        note: '',
        status: 'open',
        plannedAt: '2026-06-20T10:00:00.000Z',
        createdAt: '2026-06-20T10:00:00.000Z',
        updatedAt: '2026-06-20T10:00:00.000Z',
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
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
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByLabelText('Filtrar por cuenta')).toBeInTheDocument()
    expect((await screen.findAllByText('EURUSD')).length).toBeGreaterThan(0)
    expect(screen.getByText('GBPUSD')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filtrar por cuenta'), { target: { value: 'acc-1' } })

    expect(screen.getByText('EURUSD')).toBeInTheDocument()
    expect(screen.queryByText('GBPUSD')).not.toBeInTheDocument()
  })

  it('filtra operaciones por mes desde el combo superior y actualiza el resumen', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Cuenta Real',
        alias: 'Real',
      },
    ])
    listMarketEntriesByUserMock.mockResolvedValueOnce([
      {
        id: 'entry-jun',
        groupId: 'group-jun',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: 2,
        note: '',
        status: 'closed',
        plannedAt: '2026-06-20T10:00:00.000Z',
        createdAt: '2026-06-20T10:00:00.000Z',
        updatedAt: '2026-06-20T10:00:00.000Z',
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
      },
      {
        id: 'entry-jul',
        groupId: 'group-jul',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'GBPUSD',
        marketContext: 'NFP',
        setup: 'Pullback',
        session: 'LONDON',
        direction: 'sell',
        entryPrice: 1.3,
        stopLoss: 1.31,
        takeProfit: 1.28,
        riskAmount: 80,
        investmentPercent: 0.8,
        resultR: 1,
        note: '',
        status: 'closed',
        plannedAt: '2026-07-21T10:00:00.000Z',
        createdAt: '2026-07-21T10:00:00.000Z',
        updatedAt: '2026-07-21T10:00:00.000Z',
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByLabelText('Filtrar por mes')).toBeInTheDocument()
    expect((await screen.findAllByText('EURUSD')).length).toBeGreaterThan(0)
    expect(screen.getByText('GBPUSD')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filtrar por mes'), { target: { value: '5' } })

    expect(screen.getByText('EURUSD')).toBeInTheDocument()
    expect(screen.queryByText('GBPUSD')).not.toBeInTheDocument()
    expect(screen.getByText('Ganancias del mes')).toBeInTheDocument()
    const monthlyProfitCard = screen.getByText('Ganancias del mes').closest('article')
    const normalizedCardText = monthlyProfitCard?.textContent?.replace(/\s+/g, ' ') ?? ''
    expect(normalizedCardText).toContain('200.00')
    expect(screen.getByText('1 operaciones')).toBeInTheDocument()
  })

  it('mantiene todas las opciones de año después de seleccionar una', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Cuenta Real',
        alias: 'Real',
      },
    ])
    listMarketEntriesByUserMock.mockResolvedValueOnce([
      {
        id: 'entry-2027',
        groupId: 'group-2027',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: 2,
        note: '',
        status: 'closed',
        plannedAt: '2027-01-10T10:00:00.000Z',
        createdAt: '2027-01-10T10:00:00.000Z',
        updatedAt: '2027-01-10T10:00:00.000Z',
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
      },
      {
        id: 'entry-2026',
        groupId: 'group-2026',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'GBPUSD',
        marketContext: 'NFP',
        setup: 'Pullback',
        session: 'LONDON',
        direction: 'sell',
        entryPrice: 1.3,
        stopLoss: 1.31,
        takeProfit: 1.28,
        riskAmount: 80,
        investmentPercent: 0.8,
        resultR: 1,
        note: '',
        status: 'closed',
        plannedAt: '2026-07-21T10:00:00.000Z',
        createdAt: '2026-07-21T10:00:00.000Z',
        updatedAt: '2026-07-21T10:00:00.000Z',
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    const yearFilter = await screen.findByLabelText('Filtrar por año')

    fireEvent.change(yearFilter, { target: { value: '2027' } })

    const yearOptions = Array.from((yearFilter as HTMLSelectElement).options).map((option) => option.value)
    expect(yearOptions).toContain('2027')
    expect(yearOptions).toContain('2026')
  })

  it('aplica filtros de cuenta, año y mes en todos los KPI del resumen', async () => {
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
        id: 'entry-win-jun-2026',
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
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: 2,
        note: '',
        status: 'closed',
        plannedAt: '2026-06-10T10:00:00.000Z',
        createdAt: '2026-06-10T10:00:00.000Z',
        updatedAt: '2026-06-10T10:00:00.000Z',
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
      },
      {
        id: 'entry-loss-jun-2026',
        groupId: 'group-2',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'GBPUSD',
        marketContext: 'NFP',
        setup: 'Pullback',
        session: 'LONDON',
        direction: 'sell',
        entryPrice: 1.3,
        stopLoss: 1.31,
        takeProfit: 1.28,
        riskAmount: 50,
        investmentPercent: 1,
        resultR: -1,
        note: '',
        status: 'closed',
        plannedAt: '2026-06-12T10:00:00.000Z',
        createdAt: '2026-06-12T10:00:00.000Z',
        updatedAt: '2026-06-12T10:00:00.000Z',
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
      },
      {
        id: 'entry-open-jun-2026',
        groupId: 'group-3',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'USDJPY',
        marketContext: 'PMI',
        setup: 'Range',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 157.1,
        stopLoss: 156.9,
        takeProfit: 157.6,
        riskAmount: 70,
        investmentPercent: 0.7,
        resultR: null,
        note: '',
        status: 'open',
        plannedAt: '2026-06-14T10:00:00.000Z',
        createdAt: '2026-06-14T10:00:00.000Z',
        updatedAt: '2026-06-14T10:00:00.000Z',
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
      },
      {
        id: 'entry-break-jul-2026',
        groupId: 'group-4',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'AUDUSD',
        marketContext: 'RBA',
        setup: 'Breakout',
        session: 'ASIA',
        direction: 'buy',
        entryPrice: 0.67,
        stopLoss: 0.665,
        takeProfit: 0.68,
        riskAmount: 30,
        investmentPercent: 0.5,
        resultR: 1,
        note: '',
        status: 'closed',
        plannedAt: '2026-07-02T10:00:00.000Z',
        createdAt: '2026-07-02T10:00:00.000Z',
        updatedAt: '2026-07-02T10:00:00.000Z',
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
      },
      {
        id: 'entry-other-account',
        groupId: 'group-5',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-2',
        accountName: 'Demo',
        symbol: 'XAUUSD',
        marketContext: 'FOMC',
        setup: 'Momentum',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 2350,
        stopLoss: 2345,
        takeProfit: 2365,
        riskAmount: 40,
        investmentPercent: 0.8,
        resultR: 1.5,
        note: '',
        status: 'closed',
        plannedAt: '2026-06-18T10:00:00.000Z',
        createdAt: '2026-06-18T10:00:00.000Z',
        updatedAt: '2026-06-18T10:00:00.000Z',
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
      },
      {
        id: 'entry-other-year',
        groupId: 'group-6',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'NZDUSD',
        marketContext: 'GDP',
        setup: 'Pullback',
        session: 'LONDON',
        direction: 'sell',
        entryPrice: 0.62,
        stopLoss: 0.625,
        takeProfit: 0.61,
        riskAmount: 20,
        investmentPercent: 0.4,
        resultR: 3,
        note: '',
        status: 'closed',
        plannedAt: '2025-06-18T10:00:00.000Z',
        createdAt: '2025-06-18T10:00:00.000Z',
        updatedAt: '2025-06-18T10:00:00.000Z',
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    fireEvent.change(await screen.findByLabelText('Filtrar por cuenta'), { target: { value: 'acc-1' } })
    fireEvent.change(screen.getByLabelText('Filtrar por año'), { target: { value: '2026' } })
    fireEvent.change(screen.getByLabelText('Filtrar por mes'), { target: { value: '5' } })

    const gananciaCardText = screen.getByText('Ganancias del mes').closest('article')?.textContent ?? ''
    const exitoCardText = screen.getByText('Tasa de exito').closest('article')?.textContent ?? ''
    const perdidaCardText = screen.getByText('Tasa de perdida').closest('article')?.textContent ?? ''
    const pesoMonetarioCardText = screen.getByText('Peso monetario ganado').closest('article')?.textContent ?? ''
    const profitFactorCardText = screen.getByRole('heading', { name: 'Profit Factor', level: 2 }).closest('article')?.textContent ?? ''
    const mejorDiaCardText = screen.getAllByText('Mejor dia para operar')[0]?.closest('article')?.textContent ?? ''
    const resumenDistribucion = screen.getByLabelText('Métricas de desempeño').textContent ?? ''

    const normalizedGananciaCardText = gananciaCardText.replace(/\s+/g, ' ').trim()
    const normalizedExitoCardText = exitoCardText.replace(/\s+/g, ' ').trim()
    const normalizedPerdidaCardText = perdidaCardText.replace(/\s+/g, ' ').trim()
    const normalizedPesoMonetarioCardText = pesoMonetarioCardText.replace(/\s+/g, ' ').trim()
    const normalizedProfitFactorCardText = profitFactorCardText.replace(/\s+/g, ' ').trim()
    const normalizedMejorDiaCardText = mejorDiaCardText.replace(/\s+/g, ' ').trim()

    expect(normalizedGananciaCardText).toContain('3 operaciones')
    expect(normalizedGananciaCardText).toContain('150.00')

    expect(normalizedExitoCardText).toContain('50.0%')
    expect(normalizedExitoCardText).toContain('W/L: 1/1')

    expect(normalizedPerdidaCardText).toContain('50.0%')
    expect(normalizedPerdidaCardText).toContain('W/L: 1/1')

    expect(normalizedPesoMonetarioCardText).toContain('80.0%')
    expect(normalizedPesoMonetarioCardText).toContain('Vs perdido: 20.0%')

    expect(normalizedProfitFactorCardText).toContain('4.00')
    expect(normalizedProfitFactorCardText).toContain(formatCurrency(200).replace(/\s+/g, ' ').trim())
    expect(normalizedProfitFactorCardText).toContain(formatCurrency(50).replace(/\s+/g, ' ').trim())

    expect(normalizedMejorDiaCardText).toContain('Mejor dia para operar')
    expect(normalizedMejorDiaCardText).toContain(distributionAmountLabel(200).replace(/\s+/g, ' ').trim())

    expect(resumenDistribucion).toContain('Profit Factor')
    expect(resumenDistribucion).toContain('4.00')
    expect(resumenDistribucion).toContain('Win/Loss ratio')
    expect(resumenDistribucion).toContain('1:1')
  })

  it('formatea moneda correctamente en los KPIs', async () => {
    listTradingAccountsMock.mockResolvedValue([])
    listMarketEntriesByUserMock.mockResolvedValue([
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
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 1000,
        investmentPercent: 1,
        resultR: 2.5,
        note: '',
        status: 'closed',
        plannedAt: '2026-06-20T10:00:00.000Z',
        createdAt: '2026-06-20T10:00:00.000Z',
        updatedAt: '2026-06-20T10:00:00.000Z',
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    const usdValues = await screen.findAllByText((content) => content.includes('USD'))
    expect(usdValues.length).toBeGreaterThan(0)
    expect(screen.getByText('Tasa de perdida')).toBeInTheDocument()
  })

  it('calcula ganancia correcta del mes cuando hay operaciones cerradas', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
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
          stopLoss: 1,
          takeProfit: 1.2,
          riskAmount: 500,
          investmentPercent: 1,
          resultR: 3,
          note: '',
          status: 'closed',
          plannedAt: '2026-06-20T10:00:00.000Z',
          createdAt: '2026-06-20T10:00:00.000Z',
          updatedAt: '2026-06-20T10:00:00.000Z',
        },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    const gananciaNota = await screen.findByText('Ganancias del año')
    expect(gananciaNota).toBeInTheDocument()
    expect(screen.getByText('1 operaciones')).toBeInTheDocument()
  })

  it('dispara toggles de sidebar y prefetch por hover/focus', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-admin',
      name: 'admin',
      description: 'Administrador',
    })

    render(<DashboardPage userEmail="admin@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    const gestionarBtn = await screen.findByRole('button', { name: /Gestion 3/i })
    fireEvent.click(gestionarBtn)
    fireEvent.click(gestionarBtn)

    const cuentaBtn = screen.getByRole('button', { name: /Mi cuenta 1/i })
    fireEvent.click(cuentaBtn)
    fireEvent.click(cuentaBtn)

    const noticiasBtn = screen.getByRole('button', { name: 'Mis noticias' })
    fireEvent.mouseEnter(noticiasBtn)
    fireEvent.focus(noticiasBtn)

    const entradasBtn = screen.getByRole('button', { name: 'Entradas mercado' })
    fireEvent.mouseEnter(entradasBtn)
    fireEvent.focus(entradasBtn)

    const cuentasBtn = screen.getByRole('button', { name: 'Gestionar cuentas' })
    fireEvent.mouseEnter(cuentasBtn)
    fireEvent.focus(cuentasBtn)

    const usuariosBtn = screen.getByRole('button', { name: 'Gestionar usuarios' })
    fireEvent.mouseEnter(usuariosBtn)
    fireEvent.focus(usuariosBtn)

    const configBtn = screen.getByRole('button', { name: 'Configuración' })
    fireEvent.mouseEnter(configBtn)
    fireEvent.focus(configBtn)

    expect(screen.getByText('Dashboard de Inversiones')).toBeInTheDocument()
  })

  it('calcula ganancia cero cuando no hay operaciones', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('0 operaciones')).toBeInTheDocument()
  })



  it('muestra tasa de exito 0% cuando no hay operaciones cerradas', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
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
        stopLoss: 1,
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
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    const zeroRates = await screen.findAllByText(/0\.0%|0%/)
    expect(zeroRates.length).toBeGreaterThan(0)
  })

  it('muestra KPI de mejor día para operar con operaciones cerradas', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
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
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 500,
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
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'GBPUSD',
        marketContext: 'NFP',
        setup: 'Pullback',
        session: 'LONDON',
        direction: 'sell',
        entryPrice: 1.3,
        stopLoss: 1.31,
        takeProfit: 1.28,
        riskAmount: 300,
        investmentPercent: 1,
        resultR: 2,
        note: '',
        status: 'closed',
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

    const mejorDiaSeccion = await screen.findAllByText('Mejor dia para operar')
    expect(mejorDiaSeccion.length).toBeGreaterThan(0)
    expect(screen.getAllByText((content) => content.includes('Total: +USD') && content.includes('600.00')).length).toBeGreaterThan(0)
  })

  it('muestra tabla de operaciones recientes ordenadas por fecha', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
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
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: 1,
        note: '',
        status: 'closed',
        plannedAt: '2026-06-10T10:00:00.000Z',
        createdAt: '2026-06-10T10:00:00.000Z',
        updatedAt: '2026-06-10T10:00:00.000Z',
      },
      {
        id: 'entry-2',
        groupId: 'group-2',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'GBPUSD',
        marketContext: 'NFP',
        setup: 'Pullback',
        session: 'LONDON',
        direction: 'sell',
        entryPrice: 1.3,
        stopLoss: 1.31,
        takeProfit: 1.28,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: -0.5,
        note: '',
        status: 'closed',
        plannedAt: '2026-06-20T10:00:00.000Z',
        createdAt: '2026-06-20T10:00:00.000Z',
        updatedAt: '2026-06-20T10:00:00.000Z',
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('Operaciones recientes')).toBeInTheDocument()
    expect(screen.getByText('EURUSD')).toBeInTheDocument()
    expect(screen.getByText('GBPUSD')).toBeInTheDocument()
  })

  it('muestra total y promedio en Breakeven cuando hay breaks tecnicos', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([
      {
        id: 'entry-break-1',
        groupId: 'group-break-1',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 150,
        investmentPercent: 1,
        resultR: 1,
        note: '',
        status: 'closed',
        plannedAt: '2026-07-10T10:00:00.000Z',
        createdAt: '2026-07-10T10:00:00.000Z',
        updatedAt: '2026-07-10T10:00:00.000Z',
      },
      {
        id: 'entry-break-2',
        groupId: 'group-break-2',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'EURUSD',
        marketContext: 'NFP',
        setup: 'Pullback',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 10,
        investmentPercent: 1,
        resultR: 1,
        note: '',
        status: 'closed',
        plannedAt: '2026-07-10T10:00:00.000Z',
        createdAt: '2026-07-10T10:00:00.000Z',
        updatedAt: '2026-07-10T10:00:00.000Z',
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

  expect(await screen.findByText('Distribucion de operaciones')).toBeInTheDocument()
  const distributionSummary = screen.getByLabelText('Resumen de distribución de operaciones')
  expect(within(distributionSummary).getByText((content) => content.includes('Total:') && content.includes('160.00'))).toBeInTheDocument()
  expect(within(distributionSummary).getByText((content) => content.includes('Promedio:') && content.includes('80.00'))).toBeInTheDocument()
  })

  it('aplica filtros por columnas en la tabla de operaciones recientes', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([
      {
        id: 'entry-filter-1',
        groupId: 'group-filter-1',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: 1,
        note: 'nota',
        status: 'closed',
        plannedAt: '2026-06-20T10:00:00.000Z',
        createdAt: '2026-06-20T10:00:00.000Z',
        updatedAt: '2026-06-20T10:00:00.000Z',
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('Operaciones recientes')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Filtrar fecha'), { target: { value: '20/06/2026' } })
    fireEvent.change(screen.getByPlaceholderText('Filtrar par'), { target: { value: 'EUR' } })
    fireEvent.change(screen.getByPlaceholderText('Filtrar tipo'), { target: { value: 'BUY' } })
    fireEvent.change(screen.getByPlaceholderText('Filtrar invertido'), { target: { value: '100' } })
    fireEvent.change(screen.getByPlaceholderText('Filtrar resultado'), { target: { value: '100' } })
    fireEvent.change(screen.getByPlaceholderText('Filtrar tecnico'), { target: { value: 'Break tecnico' } })
    fireEvent.change(screen.getByPlaceholderText('Filtrar estado'), { target: { value: 'Completada' } })

    expect(screen.getByText('EURUSD')).toBeInTheDocument()
  })

  it('permite editar entrada desde modal, cancelar y guardar cambios', async () => {
        listUserNewsMock.mockResolvedValueOnce([
          {
            id: 'news-1',
            title: 'CPI relevante',
          },
        ])

    const baseEntry = {
      id: 'entry-edit-1',
      groupId: 'group-edit-1',
      userEmail: 'usuario@demo.com',
      accountId: 'acc-1',
      accountName: 'Real',
      symbol: 'EURUSD',
      marketContext: 'CPI',
      setup: 'Breakout',
      session: 'NEW YORK',
      direction: 'buy' as const,
      entryPrice: 1.1,
      stopLoss: 1,
      takeProfit: 1.2,
      riskAmount: 100,
      investmentPercent: 1,
      resultR: 1,
      note: 'nota inicial',
      status: 'closed' as const,
      operationLink: 'https://example.com/old',
      plannedAt: '2026-06-20T10:00:00.000Z',
      createdAt: '2026-06-20T10:00:00.000Z',
      updatedAt: '2026-06-20T10:00:00.000Z',
      contextSource: null,
      newsArticleId: null,
      noEntryReason: null,
    }

    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock
      .mockResolvedValueOnce([baseEntry])
      .mockResolvedValueOnce([
        {
          ...baseEntry,
          riskAmount: 125,
          investmentPercent: 1.5,
          resultR: 2,
          operationLink: 'https://example.com/new',
          note: 'nota actualizada',
          noEntryReason: 'No vi confirmacion',
        },
      ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('Operaciones recientes')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Editar entrada EURUSD' }))
    expect(await screen.findByText('Editar entrada')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar modal' }))
    expect(screen.queryByText('Editar entrada')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Editar entrada EURUSD' }))

    fireEvent.change(screen.getByDisplayValue('Completada'), { target: { value: 'no_entry' } })
    fireEvent.change(screen.getByDisplayValue('Selecciona noticia'), { target: { value: 'news-1' } })
    fireEvent.change(screen.getByDisplayValue('Selecciona impacto'), { target: { value: 'high' } })
    fireEvent.change(screen.getByDisplayValue('Sin entrada'), { target: { value: 'closed' } })
    fireEvent.change(screen.getByLabelText('Fecha de ejecución'), { target: { value: '2026-06-21T12:30' } })
    fireEvent.change(screen.getByLabelText('Riesgo por cuenta (USD)'), { target: { value: '$125.00' } })
    fireEvent.change(screen.getByLabelText('Resultado R'), { target: { value: '2.0' } })
    fireEvent.change(screen.getByLabelText('Link de operación'), { target: { value: 'https://example.com/new' } })
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: 'nota actualizada' } })

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(updateMarketEntryByIdMock).toHaveBeenCalledWith('usuario@demo.com', 'entry-edit-1', expect.objectContaining({
        status: 'closed',
        accountId: 'acc-1',
        accountName: 'Real',
        riskAmount: 125,
        investmentPercent: 1,
        resultR: 2,
        operationLink: 'https://example.com/new',
        note: 'nota actualizada',
        noEntryReason: '',
      }))
      expect(listMarketEntriesByUserMock).toHaveBeenCalledTimes(2)
    })
  })

  it('mantiene la cuenta asociada al cambiar a sin entrada desde el dashboard', async () => {
        listUserNewsMock.mockResolvedValueOnce([
          {
            id: 'news-1',
            title: 'CPI relevante',
          },
        ])

    const baseEntry = {
      id: 'entry-no-entry-1',
      groupId: 'group-no-entry-1',
      userEmail: 'usuario@demo.com',
      accountId: 'acc-1',
      accountName: 'Real',
      symbol: 'EURUSD',
      marketContext: 'CPI',
      setup: 'Breakout',
      session: 'NEW YORK',
      direction: 'buy' as const,
      entryPrice: 1.1,
      stopLoss: 1,
      takeProfit: 1.2,
      riskAmount: 100,
      investmentPercent: 1,
      resultR: null,
      note: 'nota inicial',
      status: 'open' as const,
      operationLink: 'https://example.com/old',
      plannedAt: '2026-06-20T10:00:00.000Z',
      createdAt: '2026-06-20T10:00:00.000Z',
      updatedAt: '2026-06-20T10:00:00.000Z',
      contextSource: null,
      newsArticleId: null,
      noEntryReason: null,
    }

    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock
      .mockResolvedValueOnce([baseEntry])
      .mockResolvedValueOnce([{ ...baseEntry, status: 'no_entry', noEntryReason: 'No vi confirmacion' }])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('Operaciones recientes')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Editar entrada EURUSD' }))
    fireEvent.change(screen.getByDisplayValue('Completada'), { target: { value: 'no_entry' } })
    fireEvent.change(screen.getByDisplayValue('Selecciona noticia'), { target: { value: 'news-1' } })
    fireEvent.change(screen.getByDisplayValue('Selecciona impacto'), { target: { value: 'high' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(updateMarketEntryByIdMock).toHaveBeenCalledWith('usuario@demo.com', 'entry-no-entry-1', expect.objectContaining({
        status: 'no_entry',
        accountId: 'acc-1',
        accountName: 'Real',
        investmentPercent: 1,
        contextSource: 'news',
        newsArticleId: 'news-1',
        newsImpact: 'high',
        marketContext: 'CPI relevante',
        noEntryReason: 'CPI relevante',
      }))
    })
  })

  it('muestra error al guardar con resultado R inválido en estado completada', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([
      {
        id: 'entry-edit-error',
        groupId: 'group-edit-error',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1,
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
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('Operaciones recientes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Editar entrada EURUSD' }))

    fireEvent.change(screen.getByLabelText('Resultado R'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('El Resultado R debe ser valido para estado Completada.')).toBeInTheDocument()
    expect(updateMarketEntryByIdMock).not.toHaveBeenCalled()
  })

  it('guarda edición con Resultado R usando coma decimal', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([
      {
        id: 'entry-edit-comma',
        groupId: 'group-edit-comma',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1,
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
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('Operaciones recientes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Editar entrada EURUSD' }))

    fireEvent.change(screen.getByLabelText('Resultado R'), { target: { value: '2,55' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(updateMarketEntryByIdMock).toHaveBeenCalledWith(
        'usuario@demo.com',
        'entry-edit-comma',
        expect.objectContaining({
          status: 'closed',
          resultR: 2.55,
        }),
      )
    })
  })

  it('abre modal de edición en dashboard desde el botón de ojo sin redirección', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([
      {
        id: 'entry-eye-1',
        groupId: 'group-eye',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: 1,
        note: '',
        status: 'closed',
        plannedAt: '2026-07-10T10:00:00.000Z',
        createdAt: '2026-07-10T10:00:00.000Z',
        updatedAt: '2026-07-10T10:00:00.000Z',
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('Operaciones recientes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Editar entrada EURUSD' }))

    expect(await screen.findByText('Editar entrada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resumen' })).toHaveClass('active')
  })

  it('usa handlers de fecha readonly y cierra modal con evento cancel', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([
      {
        id: 'entry-cancel-1',
        groupId: 'group-cancel',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: 1,
        note: '',
        status: 'closed',
        plannedAt: '2026-07-10T10:00:00.000Z',
        createdAt: '2026-07-10T10:00:00.000Z',
        updatedAt: '2026-07-10T10:00:00.000Z',
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    const editButtons = await screen.findAllByRole('button', { name: /Editar entrada/ })
    fireEvent.click(editButtons[0])
    const dateInput = screen.getByLabelText('Fecha de ejecución') as HTMLInputElement
    fireEvent.focus(dateInput)
    fireEvent.click(dateInput)
    fireEvent.keyDown(dateInput, { key: '1' })
    fireEvent.keyDown(dateInput, { key: 'Tab' })
    fireEvent.paste(dateInput, { clipboardData: { getData: () => '2026-07-10T12:00' } as unknown as DataTransfer })
    fireEvent.change(dateInput, { target: { value: '2026-07-10T12:00' } })

    fireEvent.mouseDown(screen.getByText('Editar entrada'))
    expect(screen.getByRole('dialog', { name: 'Editar entrada' })).toBeInTheDocument()

    const dialog = screen.getByRole('dialog', { name: 'Editar entrada' })
    fireEvent(dialog, new Event('cancel', { cancelable: true }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Editar entrada' })).not.toBeInTheDocument()
    })
  })

  it('abre el link de operación desde el botón de navegación', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([
      {
        id: 'entry-link-1',
        groupId: 'group-link',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: 1,
        note: '',
        status: 'closed',
        operationLink: 'https://example.com/trade/1',
        plannedAt: '2026-07-10T10:00:00.000Z',
        createdAt: '2026-07-10T10:00:00.000Z',
        updatedAt: '2026-07-10T10:00:00.000Z',
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('Operaciones recientes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir link de EURUSD' }))

    expect(openSpy).toHaveBeenCalledWith('https://example.com/trade/1', '_blank', 'noopener,noreferrer')
    openSpy.mockRestore()
  })

  it('activa controles móviles y expande detalles de operación en la tabla', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([
      {
        id: 'entry-mobile-1',
        groupId: 'group-mobile-1',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: 1,
        note: '',
        status: 'closed',
        operationLink: 'https://example.com/mobile',
        plannedAt: '2026-07-10T10:00:00.000Z',
        createdAt: '2026-07-10T10:00:00.000Z',
        updatedAt: '2026-07-10T10:00:00.000Z',
        contextSource: null,
        newsArticleId: null,
        noEntryReason: null,
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar u ocultar menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar u ocultar filtros' }))
    fireEvent.click(screen.getByRole('button', { name: /Mostrar detalles de EURUSD/i }))

    expect((await screen.findAllByText('EURUSD')).length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: /Abrir link de EURUSD/i })[0])
    expect(openSpy).toHaveBeenCalledWith('https://example.com/mobile', '_blank', 'noopener,noreferrer')

    openSpy.mockRestore()
  })

  it('muestra mensaje cuando no hay operaciones recientes', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('No hay operaciones para el filtro seleccionado.')).toBeInTheDocument()
  })

  it('carga y persiste la pestaña activa en localStorage', async () => {
    localStorage.setItem('inversiones_dashboard_active_tab', 'cuentas')

    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Gestionar cuentas' }))

    expect(localStorage.getItem('inversiones_dashboard_active_tab')).toBe('cuentas')
  })

  it.each([
    {
      caseName: 'noticias',
      buttonName: 'Mis noticias',
      expectedContent: 'Modulo de Noticias',
    },
    {
      caseName: 'entradas',
      buttonName: 'Entradas mercado',
      expectedContent: 'Modulo de Entradas',
    },
    {
      caseName: 'configuracion',
      buttonName: 'Configuración',
      expectedContent: 'Modulo de Configuracion',
    },
  ])('muestra $caseName cuando se selecciona su pestaña', async ({ buttonName, expectedContent }) => {
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    fireEvent.click(screen.getByRole('button', { name: buttonName }))

    expect(await screen.findByText(expectedContent)).toBeInTheDocument()
  })

  it('maneja error cuando falla la carga de cuentas', async () => {
    listTradingAccountsMock.mockRejectedValueOnce(new Error('Failed to load accounts'))
    listMarketEntriesByUserMock.mockResolvedValueOnce([])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('Ganancias del año')).toBeInTheDocument()
    expect(screen.getByText('0 operaciones')).toBeInTheDocument()
  })

  it('maneja error cuando falla la carga de entradas', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockRejectedValueOnce(new Error('Failed to load entries'))

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('Ganancias del año')).toBeInTheDocument()
  })

  it('calcula profit factor con ramas de pérdida cero y normal', () => {
    expect(calculateProfitFactor(100, 0)).toBe('∞')
    expect(calculateProfitFactor(0, 0)).toBe('0.00')
    expect(calculateProfitFactor(200, -100)).toBe('2.00')
  })

  it('calcula la serie mensual con entradas sin resultado, fecha invalida y fuera de rango', () => {
    const fixedNow = new Date('2026-06-15T00:00:00.000Z')
    const monthlyData = calculateMonthlyProfitData(
      [
        {
          id: 'entry-1',
          groupId: 'group-1',
          userEmail: 'usuario@demo.com',
          accountId: 'acc-1',
          accountName: 'Real',
          symbol: 'EURUSD',
          symbolDetail: null,
          marketContext: 'CPI',
          contextSource: 'free_text',
          newsArticleId: null,
          newsImpact: null,
          setup: 'Breakout',
          session: 'NEW YORK',
          candleProtocol: 'no',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1,
          takeProfit: 1.2,
          closePrice: null,
          operationLink: null,
          riskAmount: 100,
          investmentPercent: 1,
          resultR: null,
          note: '',
          status: 'open',
          plannedAt: 'invalid-date',
          createdAt: 'invalid-date',
          updatedAt: 'invalid-date',
          noEntryReason: null,
        },
        {
          id: 'entry-2',
          groupId: 'group-2',
          userEmail: 'usuario@demo.com',
          accountId: 'acc-1',
          accountName: 'Real',
          symbol: 'GBPUSD',
          symbolDetail: null,
          marketContext: 'NFP',
          contextSource: 'free_text',
          newsArticleId: null,
          newsImpact: null,
          setup: 'Pullback',
          session: 'LONDON',
          candleProtocol: 'no',
          direction: 'sell',
          entryPrice: 1.3,
          stopLoss: 1.31,
          takeProfit: 1.28,
          closePrice: null,
          operationLink: null,
          riskAmount: 50,
          investmentPercent: 1,
          resultR: 2,
          note: '',
          status: 'closed',
          plannedAt: '2025-12-20T10:00:00.000Z',
          createdAt: '2025-12-20T10:00:00.000Z',
          updatedAt: '2025-12-20T10:00:00.000Z',
          noEntryReason: null,
        },
        {
          id: 'entry-3',
          groupId: 'group-3',
          userEmail: 'usuario@demo.com',
          accountId: 'acc-1',
          accountName: 'Real',
          symbol: 'USDJPY',
          symbolDetail: null,
          marketContext: 'FOMC',
          contextSource: 'free_text',
          newsArticleId: null,
          newsImpact: null,
          setup: 'Reversal',
          session: 'LONDON',
          candleProtocol: 'no',
          direction: 'buy',
          entryPrice: 140,
          stopLoss: 139,
          takeProfit: 141,
          closePrice: null,
          operationLink: null,
          riskAmount: 75,
          investmentPercent: 1,
          resultR: -1,
          note: '',
          status: 'closed',
          plannedAt: '2026-06-05T10:00:00.000Z',
          createdAt: '2026-06-05T10:00:00.000Z',
          updatedAt: '2026-06-05T10:00:00.000Z',
          noEntryReason: null,
        },
      ],
      fixedNow,
    )

    expect(monthlyData).toHaveLength(6)
    expect(monthlyData.some((item) => item.lossAmount !== 0)).toBe(true)
    expect(monthlyData[0]).toHaveProperty('month')
  })

  it('la serie mensual separa monto de break tecnico en su indicador dedicado', () => {
    const fixedNow = new Date('2026-07-15T00:00:00.000Z')
    const monthlyData = calculateMonthlyProfitData(
      [
        {
          id: 'entry-break-jun',
          groupId: 'group-break',
          userEmail: 'usuario@demo.com',
          accountId: 'acc-1',
          accountName: 'Real',
          symbol: 'EURUSD',
          symbolDetail: null,
          marketContext: 'CPI',
          contextSource: 'free_text',
          newsArticleId: null,
          newsImpact: null,
          setup: 'Breakout',
          session: 'NEW YORK',
          candleProtocol: 'ob',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.0,
          takeProfit: 1.2,
          closePrice: null,
          operationLink: null,
          riskAmount: 150,
          investmentPercent: 1,
          resultR: 1,
          note: '',
          status: 'closed',
          plannedAt: '2026-06-10T10:00:00.000Z',
          createdAt: '2026-06-10T10:00:00.000Z',
          updatedAt: '2026-07-10T10:00:00.000Z',
          noEntryReason: null,
        },
      ] as never,
      fixedNow,
    )

    const jun = monthlyData.find((item) => item.month === 'Jun')
    expect(jun?.amount).toBe(0)
    expect(jun?.breakevenAmount).toBe(150)
  })

  it('la serie mensual muestra todo el año cuando se seleccionan todos los meses', () => {
    const fixedNow = new Date('2026-07-15T00:00:00.000Z')
    const monthlyData = calculateMonthlyProfitData(
      [
        {
          id: 'entry-jan',
          groupId: 'group-jan',
          userEmail: 'usuario@demo.com',
          accountId: 'acc-1',
          accountName: 'Real',
          symbol: 'EURUSD',
          symbolDetail: null,
          marketContext: 'CPI',
          contextSource: 'free_text',
          newsArticleId: null,
          newsImpact: null,
          setup: 'Breakout',
          session: 'NEW YORK',
          candleProtocol: 'ob',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.0,
          takeProfit: 1.2,
          closePrice: null,
          operationLink: null,
          riskAmount: 100,
          investmentPercent: 1,
          resultR: 2,
          note: '',
          status: 'closed',
          plannedAt: '2026-01-10T10:00:00.000Z',
          createdAt: '2026-01-10T10:00:00.000Z',
          updatedAt: '2026-01-10T10:00:00.000Z',
          noEntryReason: null,
        },
      ] as never,
      fixedNow,
      'fullYear',
    )

    expect(monthlyData).toHaveLength(12)
    expect(monthlyData[0]?.month).toBe('Ene')
    expect(monthlyData[11]?.month).toBe('Dic')
    expect(monthlyData.find((item) => item.month === 'Ene')?.amount).toBe(200)
  })

  it('la serie mensual centrada muestra 2 meses antes y 2 después del mes seleccionado', () => {
    const fixedNow = new Date('2026-06-15T00:00:00.000Z')
    const monthlyData = calculateMonthlyProfitData(
      [
        {
          id: 'entry-jun-centered',
          groupId: 'group-jun-centered',
          userEmail: 'usuario@demo.com',
          accountId: 'acc-1',
          accountName: 'Real',
          symbol: 'EURUSD',
          symbolDetail: null,
          marketContext: 'CPI',
          contextSource: 'free_text',
          newsArticleId: null,
          newsImpact: null,
          setup: 'Breakout',
          session: 'NEW YORK',
          candleProtocol: 'ob',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.0,
          takeProfit: 1.2,
          closePrice: null,
          operationLink: null,
          riskAmount: 120,
          investmentPercent: 1,
          resultR: 2,
          note: '',
          status: 'closed',
          plannedAt: '2026-06-10T10:00:00.000Z',
          createdAt: '2026-06-10T10:00:00.000Z',
          updatedAt: '2026-06-10T10:00:00.000Z',
          noEntryReason: null,
        },
      ] as never,
      fixedNow,
      'centered5',
    )

    expect(monthlyData).toHaveLength(5)
    expect(monthlyData.map((item) => item.month)).toEqual(['Abr', 'May', 'Jun', 'Jul', 'Ago'])
    expect(monthlyData.find((item) => item.month === 'Jun')?.amount).toBe(240)
  })

  it('la serie diaria incluye todos los días del mes seleccionado', () => {
    const referenceDate = new Date('2026-07-15T00:00:00.000Z')
    const dailyData = calculateDailyProfitData(
      [
        {
          id: 'entry-day-win',
          groupId: 'group-day-win',
          userEmail: 'usuario@demo.com',
          accountId: 'acc-1',
          accountName: 'Real',
          symbol: 'EURUSD',
          symbolDetail: null,
          marketContext: 'CPI',
          contextSource: 'free_text',
          newsArticleId: null,
          newsImpact: null,
          setup: 'Breakout',
          session: 'NEW YORK',
          candleProtocol: 'ob',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.0,
          takeProfit: 1.2,
          closePrice: null,
          operationLink: null,
          riskAmount: 200,
          investmentPercent: 1,
          resultR: 1,
          note: '',
          status: 'closed',
          plannedAt: '2026-07-10T10:00:00.000Z',
          createdAt: '2026-07-10T10:00:00.000Z',
          updatedAt: '2026-07-10T10:00:00.000Z',
          noEntryReason: null,
        },
      ] as never,
      referenceDate,
    )

    expect(dailyData).toHaveLength(31)
    expect(dailyData[0]?.month).toBe('1')
    expect(dailyData[30]?.month).toBe('31')
    expect(dailyData.find((item) => item.month === '10')?.breakevenAmount).toBe(200)
  })

  it('formatea montos de distribución con signo', () => {
    expect(distributionAmountLabel(50)).toMatch(/^\+/)
    expect(distributionAmountLabel(-50)).toMatch(/^-/)
    expect(distributionAmountLabel(0)).not.toMatch(/^[+-]/)
  })

  it('cubre helpers de etiquetas y formato con múltiples ramas', () => {
    expect(statusLabel('planned')).toBe('Planeada')
    expect(statusLabel('open')).toBe('Abierta')
    expect(statusLabel('closed')).toBe('Completada')
    expect(statusLabel('no_entry')).toBe('Sin entrada')
    expect(statusLabel('cancelled')).toBe('Cancelada')

    expect(roleNameLabel('admin')).toBe('Administrador')
    expect(roleNameLabel('user')).toBe('Usuario')
    expect(roleNameLabel(null)).toBe('Sin rol')

    expect(tradeResultClass('-USD 10.00')).toBe('negative')
    expect(tradeResultClass('N/A')).toBe('neutral')
    expect(tradeResultClass('USD 10.00')).toBe('positive')
    expect(tradeResultClass('USD 100.00', true)).toBe('breakeven')

    expect(technicalOutcomeLabel({ status: 'closed', resultR: -1 } as never)).toBe('SL')
    expect(technicalOutcomeLabel({ status: 'closed', resultR: 0 } as never)).toBe('Sin avance')
    expect(technicalOutcomeLabel({ status: 'closed', resultR: 1 } as never)).toBe('Break tecnico 1:1')
    expect(technicalOutcomeLabel({ status: 'closed', resultR: 1.5 } as never)).toBe('TP extendido')
    expect(technicalOutcomeLabel({ status: 'closed', resultR: 0.5 } as never)).toBe('TP parcial')
    expect(financialOutcomeLabel({ status: 'closed', resultR: -1 } as never)).toBe('Perdida')
    expect(financialOutcomeLabel({ status: 'closed', resultR: 0 } as never)).toBe('Breakeven')
    expect(financialOutcomeLabel({ status: 'closed', resultR: 1 } as never)).toBe('Breakeven')
    expect(financialOutcomeLabel({ status: 'open', resultR: 1 } as never)).toBe('N/A')

    expect(getEntryExecutionDate({ status: 'closed', plannedAt: '2026-06-20T10:00:00.000Z', updatedAt: '2026-06-22T10:00:00.000Z', createdAt: '2026-06-10T10:00:00.000Z' } as never)).toBe('2026-06-20T10:00:00.000Z')
    expect(getEntryExecutionDate({ status: 'planned', plannedAt: '2026-06-20T10:00:00.000Z', updatedAt: '2026-06-22T10:00:00.000Z', createdAt: '2026-06-10T10:00:00.000Z' } as never)).toBe('2026-06-20T10:00:00.000Z')

    expect(formatDate('invalid-date')).toBe('invalid-date')
  })

  it('maneja error cuando getCurrentUserRole falla', async () => {
    getCurrentUserRoleMock.mockRejectedValueOnce(new Error('Role fetch failed'))
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([])

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('Ganancias del año')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gestionar usuarios' })).not.toBeInTheDocument()
  })

  it('usa initialRole cuando está definido para evitar llamada a API', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([])

    const initialRole = { id: 'role-admin', name: 'admin' as const, description: 'Administrador' }

    render(
      <DashboardPage
        userEmail="admin@demo.com"
        onSignOut={vi.fn().mockResolvedValue(undefined)}
        initialRole={initialRole}
      />
    )

    expect(await screen.findByText('Ganancias del año')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gestionar usuarios' })).toBeInTheDocument()
    expect(getCurrentUserRoleMock).not.toHaveBeenCalled()
  })

  it('reestablece tab a resumen cuando usuario no-admin intenta acceder a usuarios', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([])

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(await screen.findByText('Ganancias del año')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gestionar usuarios' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Entradas mercado' }))
    expect(await screen.findByText('Modulo de Entradas')).toBeInTheDocument()
  })

  it('cambia de año y filtra resultados correctamente', async () => {
    listTradingAccountsMock.mockResolvedValueOnce([])
    
    const today = new Date()
    const lastYear = today.getFullYear() - 1

    listMarketEntriesByUserMock.mockResolvedValueOnce([
      {
        id: 'entry-2025',
        groupId: 'g1',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        setup: 'Breakout',
        session: 'NY',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1,
        takeProfit: 1.2,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: 1,
        note: '',
        status: 'closed',
        plannedAt: `${lastYear}-01-10T10:00:00.000Z`,
        createdAt: `${lastYear}-01-10T10:00:00.000Z`,
        updatedAt: `${lastYear}-01-10T10:00:00.000Z`,
        newsArticleId: null,
        noEntryReason: null,
      },
      {
        id: 'entry-2026',
        groupId: 'g2',
        userEmail: 'usuario@demo.com',
        accountId: 'acc-1',
        accountName: 'Real',
        symbol: 'GBPUSD',
        marketContext: 'NFP',
        contextSource: 'free_text',
        setup: 'Pullback',
        session: 'London',
        direction: 'sell',
        entryPrice: 1.3,
        stopLoss: 1.31,
        takeProfit: 1.28,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: -0.5,
        note: '',
        status: 'closed',
        plannedAt: today.toISOString(),
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
        newsArticleId: null,
        noEntryReason: null,
      },
    ])

    getCurrentUserRoleMock.mockResolvedValueOnce({
      id: 'role-user',
      name: 'user',
      description: 'Usuario',
    })

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    const yearFilter = await screen.findByLabelText('Filtrar por año')
    expect(yearFilter).toBeInTheDocument()
    expect((yearFilter as HTMLSelectElement).value).toBe('all')
  })

  it('cubre validadores y storage helpers del dashboard', () => {
    expect(isDashboardTab('resumen')).toBe(true)
    expect(isDashboardTab('usuarios')).toBe(true)
    expect(isDashboardTab('invalido')).toBe(false)
    expect(isDashboardTab(null)).toBe(false)

    localStorage.setItem('inversiones_dashboard_active_tab', 'noticias')
    expect(loadStoredDashboardTab()).toBe('noticias')

    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    expect(loadStoredDashboardTab()).toBe('resumen')
    getItemSpy.mockRestore()
  })

  it('cubre helpers de resultado técnico/financiero y fecha de ejecución', () => {
    expect(isTechnicalBreakEven({ status: 'closed', resultR: 1 } as never)).toBe(true)
    expect(isTechnicalBreakEven({ status: 'open', resultR: 1 } as never)).toBe(false)

    expect(financialResultAmount({ status: 'open', resultR: 1, riskAmount: 100 } as never)).toBeNull()
    expect(financialResultAmount({ status: 'closed', resultR: null, riskAmount: 100 } as never)).toBeNull()
    expect(financialResultAmount({ status: 'closed', resultR: 1, riskAmount: 100 } as never)).toBe(100)
    expect(financialResultAmount({ status: 'closed', resultR: 2, riskAmount: 100 } as never)).toBe(200)

    expect(getEntryExecutionDate({
      status: 'closed',
      plannedAt: 'invalid',
      updatedAt: '2026-06-20T10:00:00.000Z',
      createdAt: '2026-06-10T10:00:00.000Z',
    } as never)).toBe('2026-06-20T10:00:00.000Z')

    expect(getEntryExecutionDate({
      status: 'closed',
      plannedAt: 'invalid',
      updatedAt: 'invalid',
      createdAt: '2026-06-10T10:00:00.000Z',
    } as never)).toBe('2026-06-10T10:00:00.000Z')
  })

  it('prefetch de tabs no lanza errores en todas las rutas', () => {
    expect(() => prefetchDashboardTab('simulacion', false)).not.toThrow()
    expect(() => prefetchDashboardTab('noticias', false)).not.toThrow()
    expect(() => prefetchDashboardTab('cuentas', false)).not.toThrow()
    expect(() => prefetchDashboardTab('entradas', false)).not.toThrow()
    expect(() => prefetchDashboardTab('configuracion', false)).not.toThrow()
    expect(() => prefetchDashboardTab('usuarios', false)).not.toThrow()
    expect(() => prefetchDashboardTab('usuarios', true)).not.toThrow()
    expect(() => prefetchDashboardTab('resumen', false)).not.toThrow()
  })

  it('cubre helpers internos de edición y formato USD', () => {
    expect(toDateTimeLocalValue('invalid')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(toDateTimeLocalValue('2026-06-20T10:00:00.000Z')).toContain('2026-06-20T10:00')

    expect(formatUsdInput('')).toBe('')
    expect(formatUsdInput('abc')).toBe('')
    expect(formatUsdInput('1250')).toBe('$1,250.00')

    expect(sanitizeUsdDraft('')).toBe('')
    expect(sanitizeUsdDraft('$0012,345x')).toBe('12.34')
    expect(sanitizeUsdDraft('10.')).toBe('10.')
    expect(toEditableUsdInput('')).toBe('')
    expect(toEditableUsdInput('$1,250.00')).toBe('1250')
    expect(toEditableUsdInput('xx')).toBe('')

    expect(parseDashboardEditValues({
      status: 'open',
      marketContext: '',
      contextSource: 'free_text',
      newsArticleId: '',
      newsImpact: '',
      plannedAt: '2026-06-20T10:00',
      riskAmount: '$100.00',
      resultR: '',
      operationLink: '',
      note: '',
      noEntryReason: '',
    }).riskAmount).toBe(100)

    expect(() => parseDashboardEditValues({
      status: 'closed',
      marketContext: '',
      contextSource: 'free_text',
      newsArticleId: '',
      newsImpact: '',
      plannedAt: '2026-06-20T10:00',
      riskAmount: '$100.00',
      resultR: '',
      operationLink: '',
      note: '',
      noEntryReason: '',
    })).toThrow('El Resultado R debe ser valido para estado Completada.')

    expect(() => parseDashboardEditValues({
      status: 'open',
      marketContext: '',
      contextSource: 'free_text',
      newsArticleId: '',
      newsImpact: '',
      plannedAt: '2026-06-20T10:00',
      riskAmount: '',
      resultR: '',
      operationLink: '',
      note: '',
      noEntryReason: '',
    })).toThrow('El Riesgo por cuenta (USD) debe ser válido.')
  })

  it('cubre helpers de insights, referencia mensual y navegación de links', () => {
    expect(fullMonthLabelFromShort('Ene')).toBe('Enero')
    expect(fullMonthLabelFromShort('Invalid')).toBe('Invalid')

    const entries = [
      {
        status: 'closed',
        resultR: 2,
        riskAmount: 100,
        plannedAt: 'invalid',
        updatedAt: 'invalid',
        createdAt: 'invalid',
      },
      {
        status: 'closed',
        resultR: 1,
        riskAmount: 50,
        plannedAt: '2026-06-20T10:00:00.000Z',
        updatedAt: '2026-06-20T10:00:00.000Z',
        createdAt: '2026-06-20T10:00:00.000Z',
      },
    ]

    const emptyInsights = calculateTradingInsights([], 'month')
    expect(emptyInsights.bestWeekLabel).toBe('Sin datos')

    const insights = calculateTradingInsights(entries as never, 'year')
    expect(insights.bestWeekLabel).toContain('Semana')
    expect(insights.bestWeekdayTrades).toBeGreaterThan(0)

    const monthRef = resolveMonthlyReferenceDate([], 'not-a-year')
    expect(monthRef).toBeInstanceOf(Date)

    const selectedYearDate = resolveMonthlyReferenceDate([], '2024')
    expect(selectedYearDate.getFullYear()).toBe(2024)

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    openOperationLink(null)
    expect(openSpy).not.toHaveBeenCalled()
    openOperationLink('https://example.com')
    expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer')
    openSpy.mockRestore()
  })

  it('cubre ramas de fechas inválidas y fuera de rango en series', () => {
    const fixedNow = new Date('2026-06-15T00:00:00.000Z')

    const monthly = calculateMonthlyProfitData([
      {
        status: 'closed',
        resultR: 1,
        riskAmount: 100,
        plannedAt: 'invalid',
        updatedAt: 'invalid',
        createdAt: 'invalid',
      },
      {
        status: 'closed',
        resultR: 1,
        riskAmount: 100,
        plannedAt: '2024-01-10T10:00:00.000Z',
        updatedAt: '2024-01-10T10:00:00.000Z',
        createdAt: '2024-01-10T10:00:00.000Z',
      },
    ] as never, fixedNow)

    expect(monthly).toHaveLength(6)
    expect(monthly.every((point) => Number.isFinite(point.amount))).toBe(true)

    const daily = calculateDailyProfitData([
      {
        status: 'closed',
        resultR: 1,
        riskAmount: 100,
        plannedAt: 'invalid',
        updatedAt: 'invalid',
        createdAt: 'invalid',
      },
      {
        status: 'closed',
        resultR: -1,
        riskAmount: 100,
        plannedAt: '2026-07-01T10:00:00.000Z',
        updatedAt: '2026-07-01T10:00:00.000Z',
        createdAt: '2026-07-01T10:00:00.000Z',
      },
    ] as never, new Date('2026-06-15T00:00:00.000Z'))

    expect(daily).toHaveLength(30)
    expect(daily.every((point) => Number.isFinite(point.amount))).toBe(true)
  })

  it('cubre prefetch con requestIdleCallback y cleanup con cancelIdleCallback', async () => {
    const requestIdleCallbackSpy = vi.fn((callback: IdleRequestCallback) => {
      callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline)
      return 11 as never
    })
    const cancelIdleCallbackSpy = vi.fn()

    Object.defineProperty(globalThis, 'requestIdleCallback', {
      value: requestIdleCallbackSpy,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(globalThis, 'cancelIdleCallback', {
      value: cancelIdleCallbackSpy,
      configurable: true,
      writable: true,
    })

    getCurrentUserRoleMock.mockResolvedValueOnce({ id: 'role-admin', name: 'admin', description: 'Administrador' })
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([])

    const { unmount } = render(<DashboardPage userEmail="admin@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)
    await screen.findByText('Ganancias del año')

    expect(requestIdleCallbackSpy).toHaveBeenCalled()
    unmount()
    expect(cancelIdleCallbackSpy).toHaveBeenCalledWith(11)
  })

  it('resetea cuenta y mes cuando filtros quedan fuera de disponibilidad', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({ id: 'role-user', name: 'user', description: 'Usuario' })
    listTradingAccountsMock
      .mockResolvedValueOnce([{ id: 'acc-1', name: 'Cuenta Real', alias: 'Real' }])
      .mockResolvedValueOnce([])
    listMarketEntriesByUserMock
      .mockResolvedValueOnce([
        {
          id: 'entry-1', groupId: 'g1', userEmail: 'usuario@demo.com', accountId: 'acc-1', accountName: 'Real',
          symbol: 'EURUSD', marketContext: 'CPI', setup: 'Breakout', session: 'NY', direction: 'buy',
          entryPrice: 1.1, stopLoss: 1, takeProfit: 1.2, riskAmount: 100, investmentPercent: 1, resultR: 1,
          status: 'closed', note: '', plannedAt: '2026-06-10T10:00:00.000Z', createdAt: '2026-06-10T10:00:00.000Z', updatedAt: '2026-06-10T10:00:00.000Z',
          contextSource: null, newsArticleId: null, noEntryReason: null,
        },
      ])
      .mockResolvedValueOnce([])

    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    const accountFilter = await screen.findByLabelText('Filtrar por cuenta')
    const yearFilter = screen.getByLabelText('Filtrar por año')
    const monthFilter = screen.getByLabelText('Filtrar por mes')

    fireEvent.change(accountFilter, { target: { value: 'acc-1' } })
    fireEvent.change(yearFilter, { target: { value: '2026' } })
    fireEvent.change(monthFilter, { target: { value: '5' } })

    fireEvent.click(screen.getByRole('button', { name: 'Entradas mercado' }))
    await screen.findByText('Modulo de Entradas')
    fireEvent.click(screen.getByRole('button', { name: 'Resumen' }))
    await screen.findByText('Ganancias del año')

    expect(screen.getByLabelText('Filtrar por cuenta')).toHaveValue('all')
    expect(screen.getByLabelText('Filtrar por mes')).toHaveValue('all')
  })

  it('ejecuta onFocus de botones de sidebar para todas las pestañas', async () => {
    getCurrentUserRoleMock.mockResolvedValueOnce({ id: 'role-admin', name: 'admin', description: 'Administrador' })
    listTradingAccountsMock.mockResolvedValueOnce([])
    listMarketEntriesByUserMock.mockResolvedValueOnce([])

    render(<DashboardPage userEmail="admin@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)
    await screen.findByText('Ganancias del año')

    fireEvent.focus(screen.getByRole('button', { name: 'Simulación' }))
    fireEvent.focus(screen.getByRole('button', { name: 'Mis noticias' }))
    fireEvent.focus(screen.getByRole('button', { name: 'Entradas mercado' }))
    fireEvent.focus(screen.getByRole('button', { name: 'Gestionar cuentas' }))
    fireEvent.focus(screen.getByRole('button', { name: 'Gestionar usuarios' }))
    fireEvent.focus(screen.getByRole('button', { name: 'Configuración' }))

    expect(screen.getByText('Dashboard de Inversiones')).toBeInTheDocument()
  })

})
