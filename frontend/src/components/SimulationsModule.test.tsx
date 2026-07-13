import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

const listSimulationsMock = vi.hoisted(() => vi.fn());
const listTradingAccountsMock = vi.hoisted(() => vi.fn());
const createSimulationDraftMock = vi.hoisted(() => vi.fn());
const replaceSimulationOperationsMock = vi.hoisted(() => vi.fn());
const deleteSimulationMock = vi.hoisted(() => vi.fn());
const listSimulationOperationsMock = vi.hoisted(() => vi.fn());
const saveSimulationMock = vi.hoisted(() => vi.fn());

vi.mock('@services/simulations', () => ({
  createSimulationDraft: createSimulationDraftMock,
  deleteSimulation: deleteSimulationMock,
  listSimulationOperations: listSimulationOperationsMock,
  listSimulations: listSimulationsMock,
  replaceSimulationOperations: replaceSimulationOperationsMock,
  saveSimulation: saveSimulationMock,
}));

vi.mock('@services/accounts', () => ({
  listTradingAccounts: listTradingAccountsMock,
}));

vi.mock('./AppIcon', () => ({
  AppIcon: ({ name }: { name: string }) => React.createElement('span', null, name),
}));

vi.mock('recharts', () => {
  const Wrapper = ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children)
  const Tooltip = ({ formatter, labelFormatter }: {
    formatter?: (value: number, name: string, props: { payload: { name: string; operations: number; totalAmount: number } }) => [string, string]
    labelFormatter?: (label: string) => string
  }) => {
    if (typeof formatter === 'function') {
      formatter(25, 'Exito', { payload: { name: 'Exito', operations: 1, totalAmount: 100 } })
    }
    if (typeof labelFormatter === 'function') {
      labelFormatter('Ene')
    }
    return React.createElement('div', null)
  }
  const Legend = ({ formatter }: { formatter?: (value: string) => string }) => {
    if (typeof formatter === 'function') {
      formatter('Exito')
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

import SimulationsModule, {
  applyOperationDerivedValues,
  applySelectedAccountToForm,
  calculateOperationRiskSnapshots,
  compareOperationsByDateTime,
  distributionAmountLabel,
  formatDateRange,
  formatPercentRange,
  fullMonthLabel,
  normalizeOperationTimeValue,
  resolveAccountDisplayName,
  resultTypeLabel,
  shouldAskDiscardConfirmation,
  simulationResultClass,
  simulationUsdClass,
  sortAndReindexOperations,
  statusLabel,
  toggleWeekdaySelection,
  validateStep,
  validateStepOne,
  validateStepThree,
  validateStepTwo,
  weekOfMonth,
} from './SimulationsModule';

describe('SimulationsModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTradingAccountsMock.mockResolvedValue([]);
    replaceSimulationOperationsMock.mockResolvedValue([]);
    deleteSimulationMock.mockResolvedValue(undefined);
    listSimulationOperationsMock.mockResolvedValue([]);
  });

  it('muestra estado de carga y luego vacío', async () => {
    listSimulationsMock.mockResolvedValueOnce([]);

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    expect(screen.getByText('Cargando simulaciones...')).toBeInTheDocument();
    expect(await screen.findByText('No hay simulaciones guardadas')).toBeInTheDocument();
  });

  it('muestra error si falla la carga', async () => {
    listSimulationsMock.mockRejectedValueOnce(new Error('fallo de carga'));

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    expect(await screen.findByText('fallo de carga')).toBeInTheDocument();
  });

  it('muestra lista de simulaciones guardadas', async () => {
    listSimulationsMock.mockResolvedValueOnce([
      {
        id: 'sim-1',
        userId: 'user-1',
        name: 'Q1 Backtest',
        sourceAccountId: null,
        accountName: 'Cuenta Demo',
        initialBalance: 10000,
        currency: 'USD',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        maxOperationsPerDay: 4,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 123,
        status: 'saved',
        totalOpportunities: 180,
        totalExecuted: 150,
        totalWin: 70,
        totalSl: 45,
        totalBreakeven: 20,
        totalNoTrade: 30,
        netResult: 1200,
        generatedAt: null,
        createdAt: '2026-07-10T10:00:00.000Z',
        updatedAt: '2026-07-10T10:00:00.000Z',
      },
    ]);

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    expect(await screen.findByText('Q1 Backtest')).toBeInTheDocument();
    expect(screen.getByText('Cuenta Demo')).toBeInTheDocument();
    expect(screen.getByText('Guardada')).toBeInTheDocument();
    expect(screen.getByText('Seed 123')).toBeInTheDocument();
    expect(screen.getByText('Exito: 70')).toBeInTheDocument();
    expect(screen.getByText('No operar: 30')).toBeInTheDocument();
  });

  it('muestra borrador cuando la simulacion esta en draft', async () => {
    listSimulationsMock.mockResolvedValueOnce([
      {
        id: 'sim-1',
        userId: 'user-1',
        name: 'Q1 Backtest',
        sourceAccountId: null,
        accountName: 'Cuenta Demo',
        initialBalance: 10000,
        currency: 'USD',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        maxOperationsPerDay: 4,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 123,
        status: 'draft',
        totalOpportunities: 180,
        totalExecuted: 150,
        totalWin: 70,
        totalSl: 45,
        totalBreakeven: 20,
        totalNoTrade: 30,
        netResult: 1200,
        generatedAt: null,
        createdAt: '2026-07-10T10:00:00.000Z',
        updatedAt: '2026-07-10T10:00:00.000Z',
      },
    ]);

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    expect(await screen.findByText('Borrador')).toBeInTheDocument();
  });

  it('muestra texto fallback si el error no es Error', async () => {
    listSimulationsMock.mockRejectedValueOnce('boom');

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    await waitFor(() => {
      expect(screen.getByText('No se pudieron cargar las simulaciones.')).toBeInTheDocument();
    });
  });

  it('abre wizard y valida paso 1 con cuenta existente', async () => {
    listSimulationsMock.mockResolvedValueOnce([]);
    listTradingAccountsMock.mockResolvedValueOnce([
      {
        id: 'acc-1',
        user_id: 'user-1',
        name: 'Cuenta Real',
        alias: 'Cuenta Topstep',
        broker_name: 'Broker',
        account_type: 'real',
        platform: 'mt5',
        base_currency: 'USD',
        leverage: null,
        initial_balance: 5000,
        initial_equity: null,
        opened_at: '2026-01-01',
        status: 'active',
        risk_per_trade_pct: null,
        max_daily_risk_pct: null,
        max_drawdown_pct: null,
        funding_firm: null,
        challenge_phase: null,
        profit_target_pct: null,
        daily_loss_limit_pct: null,
        max_loss_limit_pct: null,
        payout_cycle: null,
        notes: null,
        is_favorite: false,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ]);

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva simulación' }));
    expect(await screen.findByText('Cuenta base')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('El nombre de la simulación es obligatorio.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ej: Q1 Forex Demo'), { target: { value: 'Sim Q1' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Cuenta existente' }), { target: { value: 'acc-1' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Nombre de cuenta')).toHaveValue('Cuenta Topstep');
      expect(screen.getByLabelText('Capital inicial')).toHaveValue(5000);
    });

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Capital inicial' }), { target: { value: '6500' } });
    expect(screen.getByRole('spinbutton', { name: 'Capital inicial' })).toHaveValue(6500);

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Rango y días')).toBeInTheDocument();
  });

  it('permite flujo completo hasta resumen con cuenta nueva', async () => {
    listSimulationsMock.mockResolvedValueOnce([]);
    listTradingAccountsMock.mockResolvedValueOnce([]);
    createSimulationDraftMock.mockImplementationOnce(async (input) => ({
      id: 'sim-generated',
      userId: 'user-1',
      name: input.name,
      sourceAccountId: input.sourceAccountId ?? null,
      accountName: input.accountName,
      initialBalance: input.initialBalance,
      currency: input.currency,
      startDate: input.startDate,
      endDate: input.endDate,
      weekdays: input.weekdays,
      maxOperationsPerDay: input.maxOperationsPerDay,
      pctWin: input.pctWin,
      pctSl: input.pctSl,
      pctBreakeven: input.pctBreakeven,
      pctNoTrade: input.pctNoTrade,
      seed: input.seed,
      status: 'draft',
      totalOpportunities: input.totalOpportunities,
      totalExecuted: input.totalExecuted,
      totalWin: input.totalWin,
      totalSl: input.totalSl,
      totalBreakeven: input.totalBreakeven,
      totalNoTrade: input.totalNoTrade,
      netResult: input.netResult,
      generatedAt: input.generatedAt,
      createdAt: '2026-07-10T10:00:00.000Z',
      updatedAt: '2026-07-10T10:00:00.000Z',
    }));
    render(<SimulationsModule userEmail="usuario@demo.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva simulación' }));

    fireEvent.change(screen.getByPlaceholderText('Ej: Q1 Forex Demo'), { target: { value: 'Sim Demo NY' } });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ej: Demo Prop Firm')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Ej: Demo Prop Firm'), { target: { value: 'Cuenta Demo NY' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Capital inicial' }), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    const startDate = screen.getByLabelText('Fecha de inicio') as HTMLInputElement;
    const endDate = screen.getByLabelText('Fecha de fin') as HTMLInputElement;
    fireEvent.change(startDate, { target: { value: '2026-01-01' } });
    fireEvent.change(endDate, { target: { value: '2026-01-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Máximo de operaciones por día' }), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(await screen.findByText('Resumen previo')).toBeInTheDocument();
    expect(screen.getByText('Sim Demo NY')).toBeInTheDocument();
    expect(screen.getByText('Cuenta Demo NY')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Generar simulación' }));

    await waitFor(() => {
      expect(createSimulationDraftMock).toHaveBeenCalledTimes(1);
      expect(replaceSimulationOperationsMock).toHaveBeenCalledWith('sim-generated', expect.any(Array));
    });

    const submittedSimulation = createSimulationDraftMock.mock.calls[0][0];
    expect(await screen.findByText(`Simulación "Sim Demo NY" generada como borrador con ${submittedSimulation.totalOpportunities} oportunidades.`)).toBeInTheDocument();
    expect(screen.getByText(/Borrador/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar simulación' })).toBeDisabled();
    expect(screen.queryByLabelText('Lista de simulaciones guardadas')).not.toBeInTheDocument();
  });

  it('revierte la cabecera si falla la persistencia de operaciones', async () => {
    listSimulationsMock.mockResolvedValueOnce([]);
    listTradingAccountsMock.mockResolvedValueOnce([]);
    createSimulationDraftMock.mockImplementationOnce(async (input) => ({
      id: 'sim-failed',
      userId: 'user-1',
      name: input.name,
      sourceAccountId: input.sourceAccountId ?? null,
      accountName: input.accountName,
      initialBalance: input.initialBalance,
      currency: input.currency,
      startDate: input.startDate,
      endDate: input.endDate,
      weekdays: input.weekdays,
      maxOperationsPerDay: input.maxOperationsPerDay,
      pctWin: input.pctWin,
      pctSl: input.pctSl,
      pctBreakeven: input.pctBreakeven,
      pctNoTrade: input.pctNoTrade,
      seed: input.seed,
      status: 'draft',
      totalOpportunities: input.totalOpportunities,
      totalExecuted: input.totalExecuted,
      totalWin: input.totalWin,
      totalSl: input.totalSl,
      totalBreakeven: input.totalBreakeven,
      totalNoTrade: input.totalNoTrade,
      netResult: input.netResult,
      generatedAt: input.generatedAt,
      createdAt: '2026-07-10T10:00:00.000Z',
      updatedAt: '2026-07-10T10:00:00.000Z',
    }));
    replaceSimulationOperationsMock.mockRejectedValueOnce(new Error('fallo operaciones'));

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva simulación' }));
    fireEvent.change(screen.getByPlaceholderText('Ej: Q1 Forex Demo'), { target: { value: 'Sim Demo NY' } });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ej: Demo Prop Firm')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Ej: Demo Prop Firm'), { target: { value: 'Cuenta Demo NY' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Capital inicial' }), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2026-01-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generar simulación' }));

    expect(await screen.findByText('fallo operaciones')).toBeInTheDocument();
    expect(deleteSimulationMock).toHaveBeenCalledWith('sim-failed');
  });

  it('valida paso 2, paso 3 y maneja error de carga de cuentas', async () => {
    listSimulationsMock.mockResolvedValueOnce([]);
    listTradingAccountsMock.mockRejectedValueOnce(new Error('error cuentas'));

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva simulación' }));
    expect(await screen.findByText('error cuentas')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ej: Q1 Forex Demo'), { target: { value: 'Sim Demo NY' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: Demo Prop Firm'), { target: { value: 'Cuenta Demo NY' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Capital inicial' }), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-01-11' } });
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2026-01-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('La fecha de inicio no puede ser mayor que la fecha de fin.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2026-01-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'L' }));
    fireEvent.click(screen.getByRole('button', { name: 'M' }));
    fireEvent.click(screen.getByRole('button', { name: 'X' }));
    fireEvent.click(screen.getByRole('button', { name: 'J' }));
    fireEvent.click(screen.getByRole('button', { name: 'V' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Debes seleccionar al menos un día de operación.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'L' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getByRole('spinbutton', { name: 'Riesgo mínimo por operación' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Riesgo máximo por operación' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Riesgo mínimo por operación' }), { target: { value: '0.5' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Riesgo máximo por operación' }), { target: { value: '0.8' } });

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Máximo de operaciones por día' }), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('El máximo de operaciones por día debe ser un entero mayor a 0.')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Máximo de operaciones por día' }), { target: { value: '4' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Exito %' }), { target: { value: '50' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'SL %' }), { target: { value: '30' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Breakeven %' }), { target: { value: '20' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'No operar %' }), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('La suma de Exito, SL, Breakeven y No operar debe ser exactamente 100.')).toBeInTheDocument();
  });

  it('permite retroceder y cerrar el wizard', async () => {
    listSimulationsMock.mockResolvedValueOnce([]);
    listTradingAccountsMock.mockResolvedValueOnce([]);

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva simulación' }));
    const wizard = await screen.findByRole('dialog', { name: 'Asistente de creación de simulación' });
    fireEvent.change(screen.getByPlaceholderText('Ej: Q1 Forex Demo'), { target: { value: 'Sim Demo NY' } });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ej: Demo Prop Firm')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Ej: Demo Prop Firm'), { target: { value: 'Cuenta Demo NY' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Capital inicial' }), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Rango y días')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    expect(within(wizard).getByText('Cuenta base')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar modal de simulación' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Asistente de creación de simulación' })).not.toBeInTheDocument();
    });
  });

  it('cierra el modal del wizard con Escape y clic fuera', async () => {
    listSimulationsMock.mockResolvedValueOnce([]);
    listTradingAccountsMock.mockResolvedValueOnce([]);

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva simulación' }));
    await screen.findByRole('dialog', { name: 'Asistente de creación de simulación' });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Asistente de creación de simulación' })).not.toBeInTheDocument();
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva simulación' }));
    await screen.findByRole('dialog', { name: 'Asistente de creación de simulación' });

    const overlay = document.querySelector('.simulations-wizard-overlay') as HTMLDivElement;
    fireEvent.mouseDown(overlay);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Asistente de creación de simulación' })).not.toBeInTheDocument();
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva simulación' }));
    await screen.findByRole('dialog', { name: 'Asistente de creación de simulación' });

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Asistente de creación de simulación' })).not.toBeInTheDocument();
    });
  });

  it('abre una simulacion guardada, permite editar y guardar', async () => {
    listSimulationsMock.mockResolvedValueOnce([
      {
        id: 'sim-1',
        userId: 'user-1',
        name: 'Q1 Backtest',
        sourceAccountId: null,
        accountName: 'Cuenta Demo',
        initialBalance: 10000,
        currency: 'USD',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        maxOperationsPerDay: 4,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 123,
        status: 'saved',
        totalOpportunities: 2,
        totalExecuted: 2,
        totalWin: 1,
        totalSl: 1,
        totalBreakeven: 0,
        totalNoTrade: 0,
        netResult: 0,
        generatedAt: null,
        createdAt: '2026-07-10T10:00:00.000Z',
        updatedAt: '2026-07-10T10:00:00.000Z',
      },
    ]);
    listSimulationOperationsMock.mockResolvedValueOnce([
      {
        id: 'op-1',
        simulationId: 'sim-1',
        userId: 'user-1',
        operationDate: '2026-01-01',
        operationIndex: 1,
        side: 'buy',
        resultType: 'win',
        investedAmount: 100,
        technicalResultR: 1,
        monetaryResult: 100,
        note: '',
        isManualEdit: false,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'op-2',
        simulationId: 'sim-1',
        userId: 'user-1',
        operationDate: '2026-01-02',
        operationIndex: 2,
        side: 'sell',
        resultType: 'sl',
        investedAmount: 100,
        technicalResultR: -1,
        monetaryResult: -100,
        note: '',
        isManualEdit: false,
        createdAt: '',
        updatedAt: '',
      },
    ]);
    saveSimulationMock.mockImplementationOnce(async (input) => ({
      id: input.id,
      userId: 'user-1',
      name: input.name,
      sourceAccountId: input.sourceAccountId ?? null,
      accountName: input.accountName,
      initialBalance: input.initialBalance,
      currency: input.currency,
      startDate: input.startDate,
      endDate: input.endDate,
      weekdays: input.weekdays,
      maxOperationsPerDay: input.maxOperationsPerDay,
      pctWin: input.pctWin,
      pctSl: input.pctSl,
      pctBreakeven: input.pctBreakeven,
      pctNoTrade: input.pctNoTrade,
      seed: input.seed,
      status: 'saved',
      totalOpportunities: input.totalOpportunities,
      totalExecuted: input.totalExecuted,
      totalWin: input.totalWin,
      totalSl: input.totalSl,
      totalBreakeven: input.totalBreakeven,
      totalNoTrade: input.totalNoTrade,
      netResult: input.netResult,
      generatedAt: input.generatedAt,
      createdAt: '',
      updatedAt: '',
    }));

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    const openButtons = await screen.findAllByRole('button', { name: /Abrir/ });
    fireEvent.click(openButtons[0]);
    const workspace = await screen.findByLabelText('Dashboard de simulación');
    expect(workspace).toBeInTheDocument();
    expect(within(workspace).getByText('Q1 Backtest')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /2026/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Enero/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Semana 1/i }));

    const editButtons = await screen.findAllByRole('button', { name: 'Editar invertido 1' });
    fireEvent.click(editButtons[editButtons.length - 1]);
    const investedInputs = screen.getAllByLabelText('Invertido 1');
    fireEvent.change(investedInputs[investedInputs.length - 1], { target: { value: '50' } });
    expect(screen.getByRole('button', { name: 'Guardar simulación' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar simulación' }));

    await waitFor(() => {
      expect(saveSimulationMock).toHaveBeenCalledTimes(1);
      expect(replaceSimulationOperationsMock).toHaveBeenCalledWith('sim-1', expect.any(Array));
    });

    expect(await screen.findByText('Simulación "Q1 Backtest" guardada correctamente.')).toBeInTheDocument();
  });

  it('permite eliminar una simulacion desde su card', async () => {
    listSimulationsMock.mockResolvedValueOnce([
      {
        id: 'sim-1',
        userId: 'user-1',
        name: 'Q1 Backtest',
        sourceAccountId: null,
        accountName: 'Cuenta Demo',
        initialBalance: 10000,
        currency: 'USD',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        maxOperationsPerDay: 4,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 123,
        status: 'saved',
        totalOpportunities: 2,
        totalExecuted: 2,
        totalWin: 1,
        totalSl: 1,
        totalBreakeven: 0,
        totalNoTrade: 0,
        netResult: 0,
        generatedAt: null,
        createdAt: '2026-07-10T10:00:00.000Z',
        updatedAt: '2026-07-10T10:00:00.000Z',
      },
    ]);
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    expect(await screen.findByText('Q1 Backtest')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(deleteSimulationMock).toHaveBeenCalledWith('sim-1');
    });

    expect(screen.queryByText('Q1 Backtest')).not.toBeInTheDocument();
  });

  it('muestra fallback cuando falla la eliminación de simulación', async () => {
    listSimulationsMock.mockResolvedValueOnce([
      {
        id: 'sim-1', userId: 'user-1', name: 'Q1 Backtest', sourceAccountId: null, accountName: 'Cuenta Demo', initialBalance: 10000,
        currency: 'USD', startDate: '2026-01-01', endDate: '2026-03-31', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'], maxOperationsPerDay: 4,
        pctWin: 40, pctSl: 30, pctBreakeven: 20, pctNoTrade: 10, seed: 123, status: 'saved', totalOpportunities: 2,
        totalExecuted: 2, totalWin: 1, totalSl: 1, totalBreakeven: 0, totalNoTrade: 0, netResult: 0, generatedAt: null, createdAt: '', updatedAt: '',
      },
    ]);

    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteSimulationMock.mockRejectedValueOnce('boom');

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    expect(await screen.findByText('Q1 Backtest')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));

    expect(await screen.findByText('No se pudo eliminar la simulación.')).toBeInTheDocument();
    confirmMock.mockRestore();
  });

  it('filtra el dashboard activo por año y mes', async () => {
    listSimulationsMock.mockResolvedValueOnce([
      {
        id: 'sim-1', userId: 'user-1', name: 'Q1 Backtest', sourceAccountId: null, accountName: 'Cuenta Demo', initialBalance: 10000,
        currency: 'USD', startDate: '2025-12-01', endDate: '2026-02-28', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'], maxOperationsPerDay: 4,
        pctWin: 40, pctSl: 30, pctBreakeven: 20, pctNoTrade: 10, seed: 123, status: 'saved', totalOpportunities: 4,
        totalExecuted: 3, totalWin: 1, totalSl: 1, totalBreakeven: 1, totalNoTrade: 1, netResult: 0, generatedAt: null, createdAt: '', updatedAt: '',
      },
    ]);
    listSimulationOperationsMock.mockResolvedValueOnce([
      { id: 'op-1', simulationId: 'sim-1', userId: 'user-1', operationDate: '2025-12-31', operationIndex: 1, side: 'buy', resultType: 'win', investedAmount: 100, technicalResultR: 1, monetaryResult: 100, note: '', isManualEdit: false, createdAt: '', updatedAt: '' },
      { id: 'op-2', simulationId: 'sim-1', userId: 'user-1', operationDate: '2026-01-05', operationIndex: 1, side: 'sell', resultType: 'sl', investedAmount: 100, technicalResultR: -1, monetaryResult: -100, note: '', isManualEdit: false, createdAt: '', updatedAt: '' },
      { id: 'op-3', simulationId: 'sim-1', userId: 'user-1', operationDate: '2026-01-10', operationIndex: 2, side: 'buy', resultType: 'breakeven', investedAmount: 100, technicalResultR: 0, monetaryResult: 0, note: '', isManualEdit: false, createdAt: '', updatedAt: '' },
      { id: 'op-4', simulationId: 'sim-1', userId: 'user-1', operationDate: '2026-02-01', operationIndex: 1, side: null, resultType: 'no_trade', investedAmount: 0, technicalResultR: null, monetaryResult: 0, note: '', isManualEdit: false, createdAt: '', updatedAt: '' },
    ]);

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    fireEvent.click((await screen.findAllByRole('button', { name: /Abrir/ }))[0]);
    const workspace = await screen.findByLabelText('Dashboard de simulación');

    expect(within(workspace).getByText('4 operaciones')).toBeInTheDocument();
    expect(within(workspace).getByLabelText('Filtrar por mes')).toBeDisabled();

    fireEvent.change(within(workspace).getByLabelText('Filtrar por año'), { target: { value: '2026' } });
    expect(await within(workspace).findByText('3 operaciones')).toBeInTheDocument();

    fireEvent.change(within(workspace).getByLabelText('Filtrar por mes'), { target: { value: '0' } });
    expect(await within(workspace).findByText('2 operaciones')).toBeInTheDocument();
  });

  it('muestra error si falla el guardado de la simulacion activa', async () => {
    listSimulationsMock.mockResolvedValueOnce([
      {
        id: 'sim-1', userId: 'user-1', name: 'Q1 Backtest', sourceAccountId: null, accountName: 'Cuenta Demo', initialBalance: 10000,
        currency: 'USD', startDate: '2026-01-01', endDate: '2026-03-31', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'], maxOperationsPerDay: 4,
        pctWin: 40, pctSl: 30, pctBreakeven: 20, pctNoTrade: 10, seed: 123, status: 'saved', totalOpportunities: 2,
        totalExecuted: 2, totalWin: 1, totalSl: 1, totalBreakeven: 0, totalNoTrade: 0, netResult: 0, generatedAt: null, createdAt: '', updatedAt: '',
      },
    ]);
    listSimulationOperationsMock.mockResolvedValueOnce([
      { id: 'op-1', simulationId: 'sim-1', userId: 'user-1', operationDate: '2026-01-01', operationIndex: 1, side: 'buy', resultType: 'win', investedAmount: 100, technicalResultR: 1, monetaryResult: 100, note: '', isManualEdit: false, createdAt: '', updatedAt: '' },
      { id: 'op-2', simulationId: 'sim-1', userId: 'user-1', operationDate: '2026-01-02', operationIndex: 2, side: 'sell', resultType: 'sl', investedAmount: 100, technicalResultR: -1, monetaryResult: -100, note: '', isManualEdit: false, createdAt: '', updatedAt: '' },
    ]);
    saveSimulationMock.mockRejectedValueOnce(new Error('fallo guardado'));

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    fireEvent.click((await screen.findAllByRole('button', { name: /Abrir/ }))[0]);
    const workspace = await screen.findByLabelText('Dashboard de simulación');

    fireEvent.click(screen.getByRole('button', { name: /2026/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Enero/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Semana 1/i }));

    const editButtons = await screen.findAllByRole('button', { name: 'Editar invertido 1' });
    fireEvent.click(editButtons[editButtons.length - 1]);
    const investedInputs = screen.getAllByLabelText('Invertido 1');
    fireEvent.change(investedInputs[investedInputs.length - 1], { target: { value: '50' } });
    fireEvent.click(within(workspace).getByRole('button', { name: 'Guardar simulación' }));

    expect(await screen.findByText('fallo guardado')).toBeInTheDocument();
  });

  it('pide confirmacion antes de descartar cambios no guardados', async () => {
    listSimulationsMock.mockResolvedValueOnce([
      {
        id: 'sim-1',
        userId: 'user-1',
        name: 'Q1 Backtest',
        sourceAccountId: null,
        accountName: 'Cuenta Demo',
        initialBalance: 10000,
        currency: 'USD',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        maxOperationsPerDay: 4,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 123,
        status: 'saved',
        totalOpportunities: 1,
        totalExecuted: 1,
        totalWin: 1,
        totalSl: 0,
        totalBreakeven: 0,
        totalNoTrade: 0,
        netResult: 100,
        generatedAt: null,
        createdAt: '',
        updatedAt: '',
      },
    ]);
    listSimulationOperationsMock.mockResolvedValueOnce([
      {
        id: 'op-1',
        simulationId: 'sim-1',
        userId: 'user-1',
        operationDate: '2026-01-01',
        operationIndex: 1,
        side: 'buy',
        resultType: 'win',
        investedAmount: 100,
        technicalResultR: 1,
        monetaryResult: 100,
        note: '',
        isManualEdit: false,
        createdAt: '',
        updatedAt: '',
      },
    ]);
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    fireEvent.click((await screen.findAllByRole('button', { name: /Abrir/ }))[0]);
    const workspace = await screen.findByLabelText('Dashboard de simulación');
    expect(workspace).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /2026/i }));
    fireEvent.click(screen.getByRole('button', { name: /Enero/i }));
    fireEvent.click(screen.getByRole('button', { name: /Semana 1/i }));

    fireEvent.click(screen.getByRole('button', { name: 'Editar invertido 1' }));
    fireEvent.change(screen.getByLabelText('Invertido 1'), { target: { value: '50' } });
    fireEvent.click(within(workspace).getByRole('button', { name: 'Volver' }));

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Asistente de creación de simulación')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Dashboard de simulación')).toBeInTheDocument();
  });

  it('no muestra opción de guardado cuando no hay simulación activa', async () => {
    listSimulationsMock.mockResolvedValueOnce([]);

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    expect(await screen.findByText('No hay simulaciones guardadas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar simulación' })).not.toBeInTheDocument();
    expect(saveSimulationMock).not.toHaveBeenCalled();
  });

  it('resetea mes al cambiar año a all y maneja confirmación negativa al volver al listado', async () => {
    listSimulationsMock.mockResolvedValueOnce([
      {
        id: 'sim-1', userId: 'user-1', name: 'Q1 Backtest', sourceAccountId: null, accountName: 'Cuenta Demo', initialBalance: 10000,
        currency: 'USD', startDate: '2026-01-01', endDate: '2026-03-31', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'], maxOperationsPerDay: 4,
        pctWin: 40, pctSl: 30, pctBreakeven: 20, pctNoTrade: 10, seed: 123, status: 'saved', totalOpportunities: 2,
        totalExecuted: 2, totalWin: 1, totalSl: 1, totalBreakeven: 0, totalNoTrade: 0, netResult: 0, generatedAt: null, createdAt: '', updatedAt: '',
      },
      {
        id: 'sim-2', userId: 'user-1', name: 'Q2 Backtest', sourceAccountId: null, accountName: 'Cuenta Demo', initialBalance: 10000,
        currency: 'USD', startDate: '2026-04-01', endDate: '2026-06-30', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'], maxOperationsPerDay: 4,
        pctWin: 40, pctSl: 30, pctBreakeven: 20, pctNoTrade: 10, seed: 456, status: 'saved', totalOpportunities: 2,
        totalExecuted: 2, totalWin: 1, totalSl: 1, totalBreakeven: 0, totalNoTrade: 0, netResult: 0, generatedAt: null, createdAt: '', updatedAt: '',
      },
    ]);
    listSimulationOperationsMock.mockResolvedValue([
      { id: 'op-1', simulationId: 'sim-1', userId: 'user-1', operationDate: '2026-01-05', operationIndex: 1, side: 'buy', resultType: 'win', investedAmount: 100, technicalResultR: 1, monetaryResult: 100, note: '', isManualEdit: false, createdAt: '', updatedAt: '' },
    ]);

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    fireEvent.click((await screen.findAllByRole('button', { name: /Abrir/ }))[0]);
    const workspace = await screen.findByLabelText('Dashboard de simulación');
    fireEvent.change(within(workspace).getByLabelText('Filtrar por año'), { target: { value: '2026' } });
    fireEvent.change(within(workspace).getByLabelText('Filtrar por mes'), { target: { value: '0' } });
    fireEvent.change(within(workspace).getByLabelText('Filtrar por año'), { target: { value: 'all' } });
    expect(within(workspace).getByLabelText('Filtrar por mes')).toHaveValue('all');

    fireEvent.click(screen.getByRole('button', { name: /2026/i }));
    fireEvent.click(screen.getByRole('button', { name: /Enero/i }));
    fireEvent.click(screen.getByRole('button', { name: /Semana 1/i }));

    fireEvent.click(screen.getByRole('button', { name: 'Editar invertido 1' }));
    fireEvent.change(screen.getByLabelText('Invertido 1'), { target: { value: '50' } });
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(within(workspace).getByRole('button', { name: 'Volver' }));
    expect(confirmMock).toHaveBeenCalled();
    expect(screen.getByLabelText('Dashboard de simulación')).toBeInTheDocument();
    confirmMock.mockRestore();
  });

  it('cubre cancelación de borrado y catch no-Error al abrir operaciones', async () => {
    listSimulationsMock.mockResolvedValueOnce([
      {
        id: 'sim-1', userId: 'user-1', name: 'Q1 Backtest', sourceAccountId: null, accountName: 'Cuenta Demo', initialBalance: 10000,
        currency: 'USD', startDate: '2026-01-01', endDate: '2026-03-31', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'], maxOperationsPerDay: 4,
        pctWin: 40, pctSl: 30, pctBreakeven: 20, pctNoTrade: 10, seed: 123, status: 'saved', totalOpportunities: 2,
        totalExecuted: 2, totalWin: 1, totalSl: 1, totalBreakeven: 0, totalNoTrade: 0, netResult: 0, generatedAt: null, createdAt: '', updatedAt: '',
      },
    ]);
    listSimulationOperationsMock.mockRejectedValueOnce('boom');

    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SimulationsModule userEmail="usuario@demo.com" />);

    expect(await screen.findByText('Q1 Backtest')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));
    expect(confirmMock).toHaveBeenCalled();
    confirmMock.mockRestore();

    fireEvent.click(screen.getAllByRole('button', { name: /Abrir/ })[0]);
    expect(await screen.findByText('No se pudieron cargar las operaciones de la simulación.')).toBeInTheDocument();
  });

  it('abre modal de nueva operación, detecta colisión y permite agregar una nueva fila', async () => {
    listSimulationsMock.mockResolvedValueOnce([
      {
        id: 'sim-1', userId: 'user-1', name: 'Q1 Backtest', sourceAccountId: null, accountName: 'Cuenta Demo', initialBalance: 10000,
        currency: 'USD', startDate: '2026-01-01', endDate: '2026-03-31', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'], maxOperationsPerDay: 4,
        pctWin: 40, pctSl: 30, pctBreakeven: 20, pctNoTrade: 10, seed: 123, status: 'saved', totalOpportunities: 2,
        totalExecuted: 2, totalWin: 1, totalSl: 1, totalBreakeven: 0, totalNoTrade: 0, netResult: 0, generatedAt: null, createdAt: '', updatedAt: '',
      },
    ]);
    listSimulationOperationsMock.mockResolvedValueOnce([
      { id: 'op-1', simulationId: 'sim-1', userId: 'user-1', operationDate: '2026-01-01', operationTime: '09:00', operationIndex: 1, side: 'buy', resultType: 'win', investedAmount: 100, technicalResultR: 2, monetaryResult: 200, note: '', isManualEdit: false, createdAt: '', updatedAt: '' },
      { id: 'op-2', simulationId: 'sim-1', userId: 'user-1', operationDate: '2026-01-02', operationTime: '09:30', operationIndex: 2, side: 'sell', resultType: 'sl', investedAmount: 100, technicalResultR: -1, monetaryResult: -100, note: '', isManualEdit: false, createdAt: '', updatedAt: '' },
    ]);

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    fireEvent.click((await screen.findAllByRole('button', { name: /Abrir/ }))[0]);
    const workspace = await screen.findByLabelText('Dashboard de simulación');

    fireEvent.click(within(workspace).getByRole('button', { name: 'Agregar nueva operación' }));
    expect(screen.getByRole('dialog', { name: 'Agregar operación' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '09:00' } });
    expect(screen.getByText('Ya existe una operación en la misma fecha y hora.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('Resultado'), { target: { value: 'no_trade' } });
    expect(screen.getByText('Monto invertido (auto)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(screen.queryByRole('dialog', { name: 'Agregar operación' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /2026/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Enero/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Semana 1/i }));
    expect(screen.getAllByText('No operar').length).toBeGreaterThan(0);
    expect(screen.getByText('Hay cambios pendientes por guardar.')).toBeInTheDocument();
  });

  it('permite eliminar una fila de operación desde la tabla agrupada', async () => {
    listSimulationsMock.mockResolvedValueOnce([
      {
        id: 'sim-1', userId: 'user-1', name: 'Q1 Backtest', sourceAccountId: null, accountName: 'Cuenta Demo', initialBalance: 10000,
        currency: 'USD', startDate: '2026-01-01', endDate: '2026-03-31', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'], maxOperationsPerDay: 4,
        pctWin: 40, pctSl: 30, pctBreakeven: 20, pctNoTrade: 10, seed: 123, status: 'saved', totalOpportunities: 2,
        totalExecuted: 2, totalWin: 1, totalSl: 1, totalBreakeven: 0, totalNoTrade: 0, netResult: 0, generatedAt: null, createdAt: '', updatedAt: '',
      },
    ]);
    listSimulationOperationsMock.mockResolvedValueOnce([
      { id: 'op-1', simulationId: 'sim-1', userId: 'user-1', operationDate: '2026-01-01', operationTime: '09:00', operationIndex: 1, side: 'buy', resultType: 'win', investedAmount: 100, technicalResultR: 2, monetaryResult: 200, note: '', isManualEdit: false, createdAt: '', updatedAt: '' },
      { id: 'op-2', simulationId: 'sim-1', userId: 'user-1', operationDate: '2026-01-02', operationTime: '09:30', operationIndex: 1, side: 'sell', resultType: 'sl', investedAmount: 100, technicalResultR: -1, monetaryResult: -100, note: '', isManualEdit: false, createdAt: '', updatedAt: '' },
    ]);
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    fireEvent.click((await screen.findAllByRole('button', { name: /Abrir/ }))[0]);
    const workspace = await screen.findByLabelText('Dashboard de simulación');
    fireEvent.click(screen.getByRole('button', { name: /2026/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Enero/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Semana 1/i }));

    const deleteButtons = within(workspace).getAllByRole('button', { name: /Eliminar operación/i });
    fireEvent.click(deleteButtons[0]);

    expect(confirmMock).toHaveBeenCalled();
    expect(screen.getByText('Hay cambios pendientes por guardar.')).toBeInTheDocument();
    confirmMock.mockRestore();
  });

  it('cubre toggles de agrupación, cancelación de borrado y edición de hora, tipo y técnico', async () => {
    listSimulationsMock.mockResolvedValueOnce([
      {
        id: 'sim-1', userId: 'user-1', name: 'Q1 Backtest', sourceAccountId: null, accountName: 'Cuenta Demo', initialBalance: 10000,
        currency: 'USD', startDate: '2026-01-01', endDate: '2026-03-31', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'], maxOperationsPerDay: 4,
        pctWin: 40, pctSl: 30, pctBreakeven: 20, pctNoTrade: 10, seed: 123, status: 'saved', totalOpportunities: 3,
        totalExecuted: 3, totalWin: 1, totalSl: 1, totalBreakeven: 1, totalNoTrade: 0, netResult: 0, generatedAt: null, createdAt: '', updatedAt: '',
      },
    ]);
    listSimulationOperationsMock.mockResolvedValueOnce([
      { id: 'op-1', simulationId: 'sim-1', userId: 'user-1', operationDate: '2026-01-01', operationTime: '09:00', operationIndex: 1, side: 'buy', resultType: 'win', investedAmount: 100, technicalResultR: 2, monetaryResult: 200, note: '', isManualEdit: false, createdAt: '', updatedAt: '' },
      { id: 'op-2', simulationId: 'sim-1', userId: 'user-1', operationDate: '2026-01-02', operationTime: '10:00', operationIndex: 1, side: 'sell', resultType: 'sl', investedAmount: 100, technicalResultR: -1, monetaryResult: -100, note: '', isManualEdit: false, createdAt: '', updatedAt: '' },
      { id: 'op-3', simulationId: 'sim-1', userId: 'user-1', operationDate: '2026-01-08', operationTime: '11:00', operationIndex: 1, side: 'buy', resultType: 'breakeven', investedAmount: 100, technicalResultR: 1, monetaryResult: 100, note: '', isManualEdit: false, createdAt: '', updatedAt: '' },
    ]);
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<SimulationsModule userEmail="usuario@demo.com" />);

    fireEvent.click((await screen.findAllByRole('button', { name: /Abrir/ }))[0]);
    const workspace = await screen.findByLabelText('Dashboard de simulación');

    const yearToggle = screen.getByRole('button', { name: /2026/i });
    fireEvent.click(yearToggle);
    fireEvent.click(await screen.findByRole('button', { name: /Enero/i }));
    const week1Toggle = await screen.findByRole('button', { name: /Semana 1/i });
    fireEvent.click(week1Toggle);
    fireEvent.click(week1Toggle);
    fireEvent.click(week1Toggle);

    fireEvent.click((await screen.findAllByRole('button', { name: 'Editar hora 1' }))[0]);
    fireEvent.change(screen.getAllByLabelText('Hora 1')[0], { target: { value: '09:15' } });

    fireEvent.click((await screen.findAllByRole('button', { name: 'Editar tipo 1' }))[0]);
    fireEvent.change(screen.getAllByLabelText('Tipo 1')[0], { target: { value: 'sell' } });

    fireEvent.click((await screen.findAllByRole('button', { name: 'Editar tecnico 1' }))[0]);
    fireEvent.change(screen.getAllByLabelText('Tecnico 1')[0], { target: { value: '1' } });

    fireEvent.click((await screen.findAllByRole('button', { name: /Eliminar operación 1/i }))[0]);
    expect(confirmMock).toHaveBeenCalled();
    confirmMock.mockRestore();

    fireEvent.click(within(workspace).getByRole('button', { name: 'Agregar nueva operación' }));
    fireEvent.change(screen.getByLabelText('Resultado'), { target: { value: 'sl' } });
    fireEvent.change(screen.getByLabelText('Resultado'), { target: { value: 'breakeven' } });
    fireEvent.change(screen.getByLabelText('Resultado'), { target: { value: 'win' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Agregar operación' })).not.toBeInTheDocument();
    expect(screen.getByText('Hay cambios pendientes por guardar.')).toBeInTheDocument();
  });
});

describe('SimulationsModule helpers', () => {
  const baseForm = {
    simulationName: 'Sim 1',
    accountMode: 'existing',
    selectedAccountId: 'acc-1',
    accountName: 'Cuenta',
    initialBalance: '1000',
    currency: 'USD',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    weekdays: ['mon', 'tue'],
    maxOperationsPerDay: '2',
    riskPctMin: '0.1',
    riskPctMax: '0.2',
    pctWin: '40',
    pctSl: '30',
    pctBreakeven: '20',
    pctNoTrade: '10',
  };

  it('formatea etiquetas y montos de distribución', () => {
    expect(formatDateRange('2026-01-01', '2026-01-31')).toBe('2026-01-01 .. 2026-01-31');

    expect(statusLabel('saved')).toBe('Guardada');
    expect(statusLabel('draft')).toBe('Borrador');

    expect(resultTypeLabel('win')).toBe('Exito');
    expect(resultTypeLabel('sl')).toBe('SL');
    expect(resultTypeLabel('no_trade')).toBe('No operar');
    expect(resultTypeLabel('breakeven')).toBe('Breakeven');

    expect(distributionAmountLabel(20, 'USD')).toMatch(/^\+/);
    expect(distributionAmountLabel(-20, 'USD')).toMatch(/^-/);
    expect(distributionAmountLabel(0, 'USD')).not.toMatch(/^[+-]/);

    expect(formatPercentRange('', '')).toBe('0 - 0');
    expect(formatPercentRange('0.1', '0.2')).toBe('0.1 - 0.2');
  });

  it('aplica cuenta seleccionada y alterna weekdays', () => {
    expect(resolveAccountDisplayName({ alias: '  Alias ', name: 'Cuenta' } as never)).toBe('Alias');
    expect(resolveAccountDisplayName({ alias: '', name: 'Cuenta' } as never)).toBe('Cuenta');

    const updated = applySelectedAccountToForm(baseForm as never, {
      alias: 'Topstep',
      name: 'Cuenta Real',
      initial_balance: 2500,
      base_currency: 'EUR',
    } as never);
    expect(updated.accountName).toBe('Topstep');
    expect(updated.initialBalance).toBe('2500');
    expect(updated.currency).toBe('EUR');

    expect(toggleWeekdaySelection(['mon', 'tue'], 'wed')).toEqual(['mon', 'tue', 'wed']);
    expect(toggleWeekdaySelection(['mon', 'tue'], 'mon')).toEqual(['tue']);
  });

  it('calcula snapshots de riesgo con clamp a cero', () => {
    const snapshots = calculateOperationRiskSnapshots(100, [
      { monetaryResult: 20, investedAmount: 10 },
      { monetaryResult: -200, investedAmount: 30 },
    ] as never);

    expect(snapshots).toEqual([
      { balanceBefore: 100, balanceAfter: 120, investedAmountDisplay: 10 },
      { balanceBefore: 120, balanceAfter: 0, investedAmountDisplay: 30 },
    ]);
  });

  it('valida paso 1 para cuenta existente y nueva', () => {
    expect(validateStepOne({ ...baseForm, simulationName: ' ' } as never)).toBe('El nombre de la simulación es obligatorio.');
    expect(validateStepOne({ ...baseForm, selectedAccountId: '' } as never)).toBe('Debes seleccionar una cuenta existente.');

    expect(validateStepOne({
      ...baseForm,
      accountMode: 'new',
      accountName: ' ',
      selectedAccountId: '',
    } as never)).toBe('El nombre de la cuenta es obligatorio.');

    expect(validateStepOne({
      ...baseForm,
      accountMode: 'new',
      selectedAccountId: '',
      accountName: 'Cuenta',
      initialBalance: '0',
    } as never)).toBe('El capital inicial debe ser mayor a 0.');

    expect(validateStepOne({
      ...baseForm,
      accountMode: 'new',
      selectedAccountId: '',
      accountName: 'Cuenta',
      initialBalance: '100',
    } as never)).toBe('');
  });

  it('valida paso 2 con todos los errores y caso válido', () => {
    expect(validateStepTwo({ ...baseForm, startDate: '' } as never)).toBe('La fecha de inicio es obligatoria.');
    expect(validateStepTwo({ ...baseForm, endDate: '' } as never)).toBe('La fecha de fin es obligatoria.');
    expect(validateStepTwo({ ...baseForm, startDate: '2026-02-01', endDate: '2026-01-01' } as never)).toBe('La fecha de inicio no puede ser mayor que la fecha de fin.');
    expect(validateStepTwo({ ...baseForm, weekdays: [] } as never)).toBe('Debes seleccionar al menos un día de operación.');
    expect(validateStepTwo(baseForm as never)).toBe('');
  });

  it('valida paso 3 con reglas de límites y suma de porcentajes', () => {
    expect(validateStepThree({ ...baseForm, maxOperationsPerDay: '0' } as never)).toBe('El máximo de operaciones por día debe ser un entero mayor a 0.');

    expect(validateStepThree({ ...baseForm, riskPctMin: '-1' } as never)).toBe('El riesgo por operación debe estar entre 0 y 1.');
    expect(validateStepThree({ ...baseForm, riskPctMin: '0.4', riskPctMax: '0.2' } as never)).toBe('El riesgo mínimo por operación no puede ser mayor que el máximo.');

    expect(validateStepThree({ ...baseForm, pctWin: '101' } as never)).toBe('Los porcentajes deben estar entre 0 y 100.');
    expect(validateStepThree({ ...baseForm, pctNoTrade: '9' } as never)).toBe('La suma de Exito, SL, Breakeven y No operar debe ser exactamente 100.');

    expect(validateStepThree(baseForm as never)).toBe('');
  });

  it('valida dispatcher por paso y confirmación de descarte', () => {
    expect(validateStep(1, { ...baseForm, simulationName: ' ' } as never)).toBe('El nombre de la simulación es obligatorio.');
    expect(validateStep(2, { ...baseForm, endDate: '' } as never)).toBe('La fecha de fin es obligatoria.');
    expect(validateStep(3, { ...baseForm, maxOperationsPerDay: '0' } as never)).toBe('El máximo de operaciones por día debe ser un entero mayor a 0.');
    expect(validateStep(4, baseForm as never)).toBe('');

    expect(shouldAskDiscardConfirmation(null, true)).toBe(false);
    expect(shouldAskDiscardConfirmation({ id: 'sim-1' } as never, false)).toBe(false);
    expect(shouldAskDiscardConfirmation({ id: 'sim-1' } as never, true)).toBe(true);
  });

  it('normaliza hora, mes, semana y reindexa operaciones ordenadas', () => {
    expect(normalizeOperationTimeValue('7:1')).toBe('09:00');
    expect(normalizeOperationTimeValue('25:00')).toBe('09:00');
    expect(normalizeOperationTimeValue('08:05:00')).toBe('08:05');

    expect(weekOfMonth(1)).toBe(1);
    expect(weekOfMonth(8)).toBe(2);
    expect(fullMonthLabel(0)).toBe('Enero');

    const operations = sortAndReindexOperations([
      { id: 'b', operationDate: '2026-01-02', operationTime: '09:30', operationIndex: 7, side: 'sell', resultType: 'sl', investedAmount: 50, technicalResultR: -1, monetaryResult: -50, note: '', isManualEdit: false },
      { id: 'a', operationDate: '2026-01-02', operationTime: '08:00:00', operationIndex: 9, side: 'buy', resultType: 'win', investedAmount: 50, technicalResultR: 2, monetaryResult: 100, note: '', isManualEdit: false },
    ] as never);

    expect(compareOperationsByDateTime(operations[0], operations[1])).toBeLessThan(0);
    expect(operations[0].operationIndex).toBe(1);
    expect(operations[1].operationIndex).toBe(2);
    expect(operations[0].operationTime).toBe('08:00');
  });

  it('aplica valores derivados y clases visuales para win, sl, breakeven y no_trade', () => {
    const noTrade = applyOperationDerivedValues({
      id: '1', operationDate: '2026-01-01', operationTime: '09:00', operationIndex: 1, side: null, resultType: 'win', investedAmount: 10, technicalResultR: null, monetaryResult: 10, note: '', isManualEdit: false,
    } as never);
    expect(noTrade.resultType).toBe('no_trade');
    expect(noTrade.monetaryResult).toBe(0);

    const breakEven = applyOperationDerivedValues({
      id: '2', operationDate: '2026-01-01', operationTime: '09:00', operationIndex: 1, side: 'buy', resultType: 'win', investedAmount: 25, technicalResultR: 1, monetaryResult: 0, note: '', isManualEdit: false,
    } as never);
    expect(breakEven.resultType).toBe('breakeven');
    expect(breakEven.monetaryResult).toBe(25);

    const win = applyOperationDerivedValues({
      id: '3', operationDate: '2026-01-01', operationTime: '09:00', operationIndex: 1, side: 'buy', resultType: 'win', investedAmount: 25, technicalResultR: 2, monetaryResult: 0, note: '', isManualEdit: false,
    } as never);
    expect(win.resultType).toBe('win');
    expect(win.monetaryResult).toBe(50);

    expect(simulationResultClass('win')).toBe('positive');
    expect(simulationResultClass('sl')).toBe('negative');
    expect(simulationResultClass('breakeven')).toBe('breakeven');
    expect(simulationResultClass('no_trade')).toBe('neutral');
    expect(simulationUsdClass(win)).toBe('positive');
    expect(simulationUsdClass({ ...win, monetaryResult: -1 })).toBe('negative');
    expect(simulationUsdClass({ ...win, monetaryResult: 0, resultType: 'breakeven' })).toBe('breakeven');
    expect(simulationUsdClass({ ...win, resultType: 'no_trade', side: null, monetaryResult: 0, investedAmount: 0, technicalResultR: null })).toBe('neutral');
  });
});
