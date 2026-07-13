import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: supabaseMocks.getUser,
    },
    from: supabaseMocks.from,
  },
}));

import {
  createSimulationDraft,
  deleteSimulation,
  getSimulationById,
  listSimulationOperations,
  listSimulations,
  replaceSimulationOperations,
  saveSimulation,
  updateSimulation,
  updateSimulationOperation,
} from '@services/simulations';

function buildSimulationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sim-1',
    user_id: 'user-1',
    name: 'Simulacion Base',
    source_account_id: null,
    account_name: 'Cuenta Demo',
    initial_balance: 10000,
    currency: 'USD',
    start_date: '2026-01-01',
    end_date: '2026-01-31',
    weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    max_operations_per_day: 4,
    risk_pct_min: 1,
    risk_pct_max: 1,
    pct_win: 40,
    pct_sl: 30,
    pct_breakeven: 20,
    pct_no_trade: 10,
    seed: 1234,
    status: 'draft',
    total_opportunities: 0,
    total_executed: 0,
    total_win: 0,
    total_sl: 0,
    total_breakeven: 0,
    total_no_trade: 0,
    net_result: 0,
    generated_at: null,
    created_at: '2026-07-10T10:00:00.000Z',
    updated_at: '2026-07-10T10:00:00.000Z',
    ...overrides,
  };
}

function buildOperationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'op-1',
    simulation_id: 'sim-1',
    user_id: 'user-1',
    operation_date: '2026-01-02',
    operation_index: 1,
    side: 'buy',
    result_type: 'win',
    invested_amount: 50,
    technical_result_r: 1.2,
    monetary_result: 60,
    note: '',
    is_manual_edit: false,
    created_at: '2026-07-10T10:00:00.000Z',
    updated_at: '2026-07-10T10:00:00.000Z',
    ...overrides,
  };
}

describe('simulations service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('listSimulations devuelve vacio sin usuario autenticado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const rows = await listSimulations();

    expect(rows).toEqual([]);
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  it('createSimulationDraft valida suma de distribucion en 100', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    await expect(
      createSimulationDraft({
        name: 'Sim 1',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['mon', 'tue'],
        maxOperationsPerDay: 3,
        pctWin: 30,
        pctSl: 30,
        pctBreakeven: 30,
        pctNoTrade: 5,
        seed: 10,
      })
    ).rejects.toThrow('La suma de Exito, SL, Breakeven y No operar debe ser exactamente 100.');
  });

  it('createSimulationDraft valida fechas, dias, maximo, porcentajes y semilla', async () => {
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    await expect(
      createSimulationDraft({
        name: 'Sim 1',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 3,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 10,
      })
    ).rejects.toThrow('La fecha de inicio es obligatoria.');

    await expect(
      createSimulationDraft({
        name: 'Sim 1',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-11',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 3,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 10,
      })
    ).rejects.toThrow('La fecha de inicio no puede ser mayor que la fecha de fin.');

    await expect(
      createSimulationDraft({
        name: 'Sim 1',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['zzz'],
        maxOperationsPerDay: 3,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 10,
      })
    ).rejects.toThrow('Debes seleccionar al menos un día de operación.');

    await expect(
      createSimulationDraft({
        name: 'Sim 1',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 0,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 10,
      })
    ).rejects.toThrow('El máximo de operaciones por día debe ser un entero mayor a 0.');

    await expect(
      createSimulationDraft({
        name: 'Sim 1',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 3,
        pctWin: 110,
        pctSl: 0,
        pctBreakeven: 0,
        pctNoTrade: -10,
        seed: 10,
      })
    ).rejects.toThrow('Los porcentajes deben estar entre 0 y 100.');

    await expect(
      createSimulationDraft({
        name: 'Sim 1',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 3,
        riskPctMin: 2,
        riskPctMax: 1,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 10,
      })
    ).rejects.toThrow('El riesgo por operación debe estar entre 0 y 1.');

    await expect(
      createSimulationDraft({
        name: 'Sim 1',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 3,
        riskPctMin: 1.2,
        riskPctMax: 1.2,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 10,
      })
    ).rejects.toThrow('El riesgo por operación debe estar entre 0 y 1.');

    await expect(
      createSimulationDraft({
        name: 'Sim 1',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 3,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: Number.NaN,
      })
    ).rejects.toThrow('La semilla de simulación es obligatoria.');
  });

  it('createSimulationDraft falla sin autenticacion', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    await expect(
      createSimulationDraft({
        name: 'Sim 1',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 3,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 10,
      })
    ).rejects.toThrow('No hay un usuario autenticado para crear simulaciones.');
  });

  it('createSimulationDraft crea simulacion y normaliza weekdays', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({ data: buildSimulationRow(), error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    supabaseMocks.from.mockReturnValueOnce({ insert: mockInsert });

    const created = await createSimulationDraft({
      name: 'Sim 1',
      accountName: 'Cuenta 1',
      initialBalance: 1000,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      weekdays: ['Mon', 'fri', 'mon'],
      maxOperationsPerDay: 3,
      pctWin: 40,
      pctSl: 30,
      pctBreakeven: 20,
      pctNoTrade: 10,
      seed: 99,
    });

    expect(created.id).toBe('sim-1');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      weekdays: ['mon', 'fri'],
      user_id: 'user-1',
    }));
  });

  it('saveSimulation actualiza si recibe id', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({ data: buildSimulationRow({ status: 'saved' }), error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqUser = vi.fn().mockReturnValue({ select: mockSelect });
    const mockEqId = vi.fn().mockReturnValue({ eq: mockEqUser });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });
    supabaseMocks.from.mockReturnValueOnce({ update: mockUpdate });

    const saved = await saveSimulation({
      id: 'sim-1',
      name: 'Sim 1',
      accountName: 'Cuenta 1',
      initialBalance: 1000,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      weekdays: ['mon', 'fri'],
      maxOperationsPerDay: 3,
      pctWin: 40,
      pctSl: 30,
      pctBreakeven: 20,
      pctNoTrade: 10,
      seed: 99,
    });

    expect(saved.status).toBe('saved');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('saveSimulation crea cuando no recibe id', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({ data: buildSimulationRow({ status: 'saved' }), error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    supabaseMocks.from.mockReturnValueOnce({ insert: mockInsert });

    const saved = await saveSimulation({
      name: 'Sim 1',
      accountName: 'Cuenta 1',
      initialBalance: 1000,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      weekdays: ['mon', 'fri'],
      maxOperationsPerDay: 3,
      pctWin: 40,
      pctSl: 30,
      pctBreakeven: 20,
      pctNoTrade: 10,
      seed: 99,
    });

    expect(saved.status).toBe('saved');
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('listSimulations filtra por status y propaga error', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockOrder = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('db fail') });
    const mockEqStatus = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqStatus });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });

    await expect(listSimulations('saved')).rejects.toThrow('db fail');
  });

  it('getSimulationById retorna null sin usuario y cuando no existe', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(getSimulationById('sim-1')).resolves.toBeNull();

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const mockMaybeSingle = vi.fn().mockResolvedValueOnce({ data: null, error: null });
    const mockEqUser = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockEqId = vi.fn().mockReturnValue({ eq: mockEqUser });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqId });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });

    await expect(getSimulationById('sim-1')).resolves.toBeNull();
  });

  it('getSimulationById propaga error de consulta', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const mockMaybeSingle = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('query fail') });
    const mockEqUser = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockEqId = vi.fn().mockReturnValue({ eq: mockEqUser });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqId });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });

    await expect(getSimulationById('sim-1')).rejects.toThrow('query fail');
  });

  it('updateSimulation y deleteSimulation validan autenticacion y flujo feliz', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(
      updateSimulation('sim-1', {
        name: 'Sim 1',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 3,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 99,
      })
    ).rejects.toThrow('No hay un usuario autenticado para actualizar simulaciones.');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(deleteSimulation('sim-1')).rejects.toThrow('No hay un usuario autenticado para eliminar simulaciones.');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const mockDeleteEqUser = vi.fn().mockResolvedValueOnce({ error: null });
    const mockDeleteEqId = vi.fn().mockReturnValue({ eq: mockDeleteEqUser });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEqId });
    supabaseMocks.from.mockReturnValueOnce({ delete: mockDelete });
    await expect(deleteSimulation('sim-1')).resolves.toBeUndefined();
  });

  it('listSimulationOperations lista y ordena por fecha e indice', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockOrder = vi.fn().mockResolvedValueOnce({
      data: [
        buildOperationRow({ operation_date: '2026-01-03', operation_index: 2 }),
        buildOperationRow({ operation_date: '2026-01-03', operation_index: 1 }),
      ],
      error: null,
    });
    const mockEqUser = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEqSimulation = vi.fn().mockReturnValue({ eq: mockEqUser });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqSimulation });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });

    const rows = await listSimulationOperations('sim-1');

    expect(rows[0].operationIndex).toBe(1);
    expect(rows[1].operationIndex).toBe(2);
  });

  it('listSimulationOperations devuelve vacio sin usuario', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(listSimulationOperations('sim-1')).resolves.toEqual([]);
  });

  it('replaceSimulationOperations elimina e inserta operaciones', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockDeleteEqUser = vi.fn().mockResolvedValueOnce({ error: null });
    const mockDeleteEqSimulation = vi.fn().mockReturnValue({ eq: mockDeleteEqUser });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEqSimulation });

    const mockInsertSelect = vi.fn().mockResolvedValueOnce({ data: [buildOperationRow()], error: null });
    const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

    supabaseMocks.from
      .mockReturnValueOnce({ delete: mockDelete })
      .mockReturnValueOnce({ insert: mockInsert });

    const result = await replaceSimulationOperations('sim-1', [
      {
        operationDate: '2026-01-02',
        operationIndex: 1,
        side: 'buy',
        resultType: 'win',
        investedAmount: 50,
        technicalResultR: 1,
        monetaryResult: 50,
      },
    ]);

    expect(result).toHaveLength(1);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('replaceSimulationOperations valida autenticacion y caso vacio', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(replaceSimulationOperations('sim-1', [])).rejects.toThrow('No hay un usuario autenticado para guardar operaciones de simulación.');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const mockDeleteEqUser = vi.fn().mockResolvedValueOnce({ error: null });
    const mockDeleteEqSimulation = vi.fn().mockReturnValue({ eq: mockDeleteEqUser });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEqSimulation });
    supabaseMocks.from.mockReturnValueOnce({ delete: mockDelete });

    await expect(replaceSimulationOperations('sim-1', [])).resolves.toEqual([]);
  });

  it('replaceSimulationOperations cubre validaciones de operación', async () => {
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    await expect(replaceSimulationOperations('sim-1', [{
      operationDate: '', operationIndex: 1, side: 'buy', resultType: 'win', investedAmount: 1, technicalResultR: 1, monetaryResult: 1,
    }])).rejects.toThrow('La fecha de operación es obligatoria.');

    await expect(replaceSimulationOperations('sim-1', [{
      operationDate: '2026-01-01', operationIndex: 0, side: 'buy', resultType: 'win', investedAmount: 1, technicalResultR: 1, monetaryResult: 1,
    }])).rejects.toThrow('El índice de operación debe ser un entero mayor a 0.');

    await expect(replaceSimulationOperations('sim-1', [{
      operationDate: '2026-01-01', operationIndex: 1, side: null, resultType: 'no_trade', investedAmount: 1, technicalResultR: null, monetaryResult: 0,
    }])).rejects.toThrow('Una fila no_trade debe tener invertido en 0.');

    await expect(replaceSimulationOperations('sim-1', [{
      operationDate: '2026-01-01', operationIndex: 1, side: null, resultType: 'no_trade', investedAmount: 0, technicalResultR: 1, monetaryResult: 0,
    }])).rejects.toThrow('Una fila no_trade no puede tener resultado técnico.');

    await expect(replaceSimulationOperations('sim-1', [{
      operationDate: '2026-01-01', operationIndex: 1, side: null, resultType: 'no_trade', investedAmount: 0, technicalResultR: null, monetaryResult: 1,
    }])).rejects.toThrow('Una fila no_trade debe tener resultado monetario en 0.');

    await expect(replaceSimulationOperations('sim-1', [{
      operationDate: '2026-01-01', operationIndex: 1, side: null, resultType: 'win', investedAmount: 1, technicalResultR: 1, monetaryResult: 1,
    }])).rejects.toThrow('Las operaciones ejecutadas deben tener tipo buy o sell.');

    await expect(replaceSimulationOperations('sim-1', [{
      operationDate: '2026-01-01', operationIndex: 1, side: 'buy', resultType: 'win', investedAmount: -1, technicalResultR: 1, monetaryResult: 1,
    }])).rejects.toThrow('El valor invertido debe ser mayor o igual a 0.');

    await expect(replaceSimulationOperations('sim-1', [{
      operationDate: '2026-01-01', operationIndex: 1, side: 'buy', resultType: 'win', investedAmount: 1, technicalResultR: 1, monetaryResult: Number.NaN,
    }])).rejects.toThrow('El resultado monetario debe ser numérico.');
  });

  it('replaceSimulationOperations rechaza no_trade inconsistente', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    await expect(
      replaceSimulationOperations('sim-1', [
        {
          operationDate: '2026-01-02',
          operationIndex: 1,
          side: 'buy',
          resultType: 'no_trade',
          investedAmount: 20,
          technicalResultR: 0,
          monetaryResult: 1,
        },
      ])
    ).rejects.toThrow('Una fila no_trade no puede tener tipo buy/sell.');
  });

  it('updateSimulationOperation actualiza fila', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({ data: buildOperationRow({ side: 'sell', is_manual_edit: true }), error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqUser = vi.fn().mockReturnValue({ select: mockSelect });
    const mockEqSimulation = vi.fn().mockReturnValue({ eq: mockEqUser });
    const mockEqOperation = vi.fn().mockReturnValue({ eq: mockEqSimulation });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqOperation });

    supabaseMocks.from.mockReturnValueOnce({ update: mockUpdate });

    const updated = await updateSimulationOperation('sim-1', 'op-1', {
      side: 'sell',
      isManualEdit: true,
    });

    expect(updated.side).toBe('sell');
    expect(updated.isManualEdit).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('updateSimulationOperation valida autenticacion y reglas no_trade', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(updateSimulationOperation('sim-1', 'op-1', { side: 'buy' })).rejects.toThrow('No hay un usuario autenticado para editar operaciones de simulación.');

    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    await expect(updateSimulationOperation('sim-1', 'op-1', { resultType: 'no_trade', side: 'buy' })).rejects.toThrow('Una fila no_trade no puede tener tipo buy/sell.');
    await expect(updateSimulationOperation('sim-1', 'op-1', { resultType: 'no_trade', side: null, investedAmount: 1 })).rejects.toThrow('Una fila no_trade debe tener invertido en 0.');
    await expect(updateSimulationOperation('sim-1', 'op-1', { resultType: 'no_trade', side: null, investedAmount: 0, technicalResultR: 1 })).rejects.toThrow('Una fila no_trade no puede tener resultado técnico.');
    await expect(updateSimulationOperation('sim-1', 'op-1', { resultType: 'no_trade', side: null, investedAmount: 0, technicalResultR: null, monetaryResult: 1 })).rejects.toThrow('Una fila no_trade debe tener resultado monetario en 0.');
  });

  it('updateSimulationOperation acepta no_trade consistente', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({ data: buildOperationRow({ result_type: 'no_trade', side: null, invested_amount: 0, technical_result_r: null, monetary_result: 0 }), error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqUser = vi.fn().mockReturnValue({ select: mockSelect });
    const mockEqSimulation = vi.fn().mockReturnValue({ eq: mockEqUser });
    const mockEqOperation = vi.fn().mockReturnValue({ eq: mockEqSimulation });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqOperation });

    supabaseMocks.from.mockReturnValueOnce({ update: mockUpdate });

    const updated = await updateSimulationOperation('sim-1', 'op-1', {
      resultType: 'no_trade',
      side: null,
      investedAmount: 0,
      technicalResultR: null,
      monetaryResult: 0,
    });

    expect(updated.resultType).toBe('no_trade');
  });

  it('createSimulationDraft valida campos base faltantes y rango de riesgo min/max', async () => {
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    await expect(
      createSimulationDraft({
        name: ' ',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 1,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 1,
      })
    ).rejects.toThrow('El nombre de la simulación es obligatorio.');

    await expect(
      createSimulationDraft({
        name: 'Sim',
        accountName: ' ',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 1,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 1,
      })
    ).rejects.toThrow('El nombre de la cuenta es obligatorio.');

    await expect(
      createSimulationDraft({
        name: 'Sim',
        accountName: 'Cuenta 1',
        initialBalance: 0,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 1,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 1,
      })
    ).rejects.toThrow('El capital inicial debe ser mayor a 0.');

    await expect(
      createSimulationDraft({
        name: 'Sim',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '',
        weekdays: ['mon'],
        maxOperationsPerDay: 1,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 1,
      })
    ).rejects.toThrow('La fecha de fin es obligatoria.');

    await expect(
      createSimulationDraft({
        name: 'Sim',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 1,
        riskPctMin: 0.2,
        riskPctMax: 0.1,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 1,
      })
    ).rejects.toThrow('El riesgo mínimo por operación no puede ser mayor que el máximo.');
  });

  it('listSimulations y getSimulationById cubren fallback legacy por columna faltante', async () => {
    const missingColumn = new Error('column risk_pct_min does not exist');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const listOrderCurrent = vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn });
    const listOrderLegacy = vi.fn().mockResolvedValueOnce({ data: [buildSimulationRow()], error: null });
    const listEqStatusCurrent = vi.fn().mockReturnValue({ order: listOrderCurrent });
    const listEqStatusLegacy = vi.fn().mockReturnValue({ order: listOrderLegacy });
    const listEqUserCurrent = vi.fn().mockReturnValue({ eq: listEqStatusCurrent });
    const listEqUserLegacy = vi.fn().mockReturnValue({ eq: listEqStatusLegacy });
    const listSelectCurrent = vi.fn().mockReturnValue({ eq: listEqUserCurrent });
    const listSelectLegacy = vi.fn().mockReturnValue({ eq: listEqUserLegacy });

    supabaseMocks.from
      .mockReturnValueOnce({ select: listSelectCurrent })
      .mockReturnValueOnce({ select: listSelectLegacy });

    const listed = await listSimulations('draft');
    expect(listed).toHaveLength(1);
    expect(listed[0].riskPctMin).toBe(1);

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const getMaybeCurrent = vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn });
    const getMaybeLegacy = vi.fn().mockResolvedValueOnce({ data: buildSimulationRow(), error: null });
    const getEqUserCurrent = vi.fn().mockReturnValue({ maybeSingle: getMaybeCurrent });
    const getEqUserLegacy = vi.fn().mockReturnValue({ maybeSingle: getMaybeLegacy });
    const getEqIdCurrent = vi.fn().mockReturnValue({ eq: getEqUserCurrent });
    const getEqIdLegacy = vi.fn().mockReturnValue({ eq: getEqUserLegacy });
    const getSelectCurrent = vi.fn().mockReturnValue({ eq: getEqIdCurrent });
    const getSelectLegacy = vi.fn().mockReturnValue({ eq: getEqIdLegacy });

    supabaseMocks.from
      .mockReturnValueOnce({ select: getSelectCurrent })
      .mockReturnValueOnce({ select: getSelectLegacy });

    const found = await getSimulationById('sim-1');
    expect(found?.id).toBe('sim-1');
    expect(found?.riskPctMax).toBe(1);
  });

  it('createSimulationDraft y updateSimulation cubren fallback legacy en insert/update', async () => {
    const missingColumn = new Error('column risk_pct_min does not exist');
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const createSingleCurrent = vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn });
    const createSingleLegacy = vi.fn().mockResolvedValueOnce({ data: buildSimulationRow({ status: 'saved' }), error: null });
    const createSelectCurrent = vi.fn().mockReturnValue({ single: createSingleCurrent });
    const createSelectLegacy = vi.fn().mockReturnValue({ single: createSingleLegacy });
    const createInsertCurrent = vi.fn().mockReturnValue({ select: createSelectCurrent });
    const createInsertLegacy = vi.fn().mockReturnValue({ select: createSelectLegacy });

    supabaseMocks.from
      .mockReturnValueOnce({ insert: createInsertCurrent })
      .mockReturnValueOnce({ insert: createInsertLegacy });

    const created = await createSimulationDraft({
      name: 'Sim Legacy',
      accountName: 'Cuenta 1',
      initialBalance: 1000,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      weekdays: ['mon'],
      maxOperationsPerDay: 3,
      pctWin: 40,
      pctSl: 30,
      pctBreakeven: 20,
      pctNoTrade: 10,
      seed: 77,
      status: 'saved',
    });

    expect(created.status).toBe('saved');

    const updateSingleCurrent = vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn });
    const updateSingleLegacy = vi.fn().mockResolvedValueOnce({ data: buildSimulationRow({ id: 'sim-updated' }), error: null });
    const updateSelectCurrent = vi.fn().mockReturnValue({ single: updateSingleCurrent });
    const updateSelectLegacy = vi.fn().mockReturnValue({ single: updateSingleLegacy });
    const updateEqUserCurrent = vi.fn().mockReturnValue({ select: updateSelectCurrent });
    const updateEqUserLegacy = vi.fn().mockReturnValue({ select: updateSelectLegacy });
    const updateEqIdCurrent = vi.fn().mockReturnValue({ eq: updateEqUserCurrent });
    const updateEqIdLegacy = vi.fn().mockReturnValue({ eq: updateEqUserLegacy });
    const updateCurrent = vi.fn().mockReturnValue({ eq: updateEqIdCurrent });
    const updateLegacy = vi.fn().mockReturnValue({ eq: updateEqIdLegacy });

    supabaseMocks.from
      .mockReturnValueOnce({ update: updateCurrent })
      .mockReturnValueOnce({ update: updateLegacy });

    const updated = await updateSimulation('sim-updated', {
      name: 'Sim Legacy',
      accountName: 'Cuenta 1',
      initialBalance: 1000,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      weekdays: ['mon'],
      maxOperationsPerDay: 3,
      pctWin: 40,
      pctSl: 30,
      pctBreakeven: 20,
      pctNoTrade: 10,
      seed: 77,
    });

    expect(updated.id).toBe('sim-updated');
  });

  it('listSimulationOperations y replaceSimulationOperations cubren fallback legacy', async () => {
    const missingColumn = new Error('column risk_pct does not exist');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const listOpsOrderCurrent = vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn });
    const listOpsOrderLegacy = vi.fn().mockResolvedValueOnce({ data: [buildOperationRow()], error: null });
    const listOpsEqUserCurrent = vi.fn().mockReturnValue({ order: listOpsOrderCurrent });
    const listOpsEqUserLegacy = vi.fn().mockReturnValue({ order: listOpsOrderLegacy });
    const listOpsEqSimCurrent = vi.fn().mockReturnValue({ eq: listOpsEqUserCurrent });
    const listOpsEqSimLegacy = vi.fn().mockReturnValue({ eq: listOpsEqUserLegacy });
    const listOpsSelectCurrent = vi.fn().mockReturnValue({ eq: listOpsEqSimCurrent });
    const listOpsSelectLegacy = vi.fn().mockReturnValue({ eq: listOpsEqSimLegacy });

    supabaseMocks.from
      .mockReturnValueOnce({ select: listOpsSelectCurrent })
      .mockReturnValueOnce({ select: listOpsSelectLegacy });

    const listed = await listSimulationOperations('sim-1');
    expect(listed).toHaveLength(1);

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const replaceDeleteEqUser = vi.fn().mockResolvedValueOnce({ error: null });
    const replaceDeleteEqSim = vi.fn().mockReturnValue({ eq: replaceDeleteEqUser });
    const replaceDelete = vi.fn().mockReturnValue({ eq: replaceDeleteEqSim });

    const replaceInsertCurrentSelect = vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn });
    const replaceInsertLegacySelect = vi.fn().mockResolvedValueOnce({ data: [buildOperationRow()], error: null });
    const replaceInsertCurrent = vi.fn().mockReturnValue({ select: replaceInsertCurrentSelect });
    const replaceInsertLegacy = vi.fn().mockReturnValue({ select: replaceInsertLegacySelect });

    supabaseMocks.from
      .mockReturnValueOnce({ delete: replaceDelete })
      .mockReturnValueOnce({ insert: replaceInsertCurrent })
      .mockReturnValueOnce({ insert: replaceInsertLegacy });

    const replaced = await replaceSimulationOperations('sim-1', [{
      operationDate: '2026-01-01',
      operationIndex: 1,
      side: 'buy',
      resultType: 'win',
      investedAmount: 10,
      technicalResultR: 1,
      monetaryResult: 10,
    }]);

    expect(replaced).toHaveLength(1);
  });

  it('updateSimulationOperation cubre fallback legacy y errores de consulta', async () => {
    const missingColumn = new Error('column risk_pct does not exist');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const updateOpSingleCurrent = vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn });
    const updateOpSingleLegacy = vi.fn().mockResolvedValueOnce({ data: buildOperationRow({ note: 'trim' }), error: null });
    const updateOpSelectCurrent = vi.fn().mockReturnValue({ single: updateOpSingleCurrent });
    const updateOpSelectLegacy = vi.fn().mockReturnValue({ single: updateOpSingleLegacy });
    const updateOpEqUserCurrent = vi.fn().mockReturnValue({ select: updateOpSelectCurrent });
    const updateOpEqUserLegacy = vi.fn().mockReturnValue({ select: updateOpSelectLegacy });
    const updateOpEqSimCurrent = vi.fn().mockReturnValue({ eq: updateOpEqUserCurrent });
    const updateOpEqSimLegacy = vi.fn().mockReturnValue({ eq: updateOpEqUserLegacy });
    const updateOpEqIdCurrent = vi.fn().mockReturnValue({ eq: updateOpEqSimCurrent });
    const updateOpEqIdLegacy = vi.fn().mockReturnValue({ eq: updateOpEqSimLegacy });
    const updateOpCurrent = vi.fn().mockReturnValue({ eq: updateOpEqIdCurrent });
    const updateOpLegacy = vi.fn().mockReturnValue({ eq: updateOpEqIdLegacy });

    supabaseMocks.from
      .mockReturnValueOnce({ update: updateOpCurrent })
      .mockReturnValueOnce({ update: updateOpLegacy });

    const updated = await updateSimulationOperation('sim-1', 'op-1', {
      note: '  trim  ',
      side: 'buy',
    });
    expect(updated.id).toBe('op-1');
    expect((updateOpCurrent.mock.calls[0]?.[0] as Record<string, unknown>).note).toBe('trim');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const hardError = new Error('db update fail');
    const failSingle = vi.fn().mockResolvedValueOnce({ data: null, error: hardError });
    const failSelect = vi.fn().mockReturnValue({ single: failSingle });
    const failEqUser = vi.fn().mockReturnValue({ select: failSelect });
    const failEqSim = vi.fn().mockReturnValue({ eq: failEqUser });
    const failEqId = vi.fn().mockReturnValue({ eq: failEqSim });
    const failUpdate = vi.fn().mockReturnValue({ eq: failEqId });
    supabaseMocks.from.mockReturnValueOnce({ update: failUpdate });

    await expect(updateSimulationOperation('sim-1', 'op-1', { side: 'sell' })).rejects.toThrow('db update fail');
  });

  it('list/get/create/update en fallback legacy propagan legacyError', async () => {
    const missingColumn = new Error('column risk_pct_min does not exist');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const listOrderCurrent = vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn });
    const listOrderLegacy = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('legacy list fail') });
    const listEqUserCurrent = vi.fn().mockReturnValue({ order: listOrderCurrent });
    const listEqUserLegacy = vi.fn().mockReturnValue({ order: listOrderLegacy });
    const listSelectCurrent = vi.fn().mockReturnValue({ eq: listEqUserCurrent });
    const listSelectLegacy = vi.fn().mockReturnValue({ eq: listEqUserLegacy });
    supabaseMocks.from
      .mockReturnValueOnce({ select: listSelectCurrent })
      .mockReturnValueOnce({ select: listSelectLegacy });
    await expect(listSimulations()).rejects.toThrow('legacy list fail');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const getMaybeCurrent = vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn });
    const getMaybeLegacy = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('legacy get fail') });
    const getEqUserCurrent = vi.fn().mockReturnValue({ maybeSingle: getMaybeCurrent });
    const getEqUserLegacy = vi.fn().mockReturnValue({ maybeSingle: getMaybeLegacy });
    const getEqIdCurrent = vi.fn().mockReturnValue({ eq: getEqUserCurrent });
    const getEqIdLegacy = vi.fn().mockReturnValue({ eq: getEqUserLegacy });
    const getSelectCurrent = vi.fn().mockReturnValue({ eq: getEqIdCurrent });
    const getSelectLegacy = vi.fn().mockReturnValue({ eq: getEqIdLegacy });
    supabaseMocks.from
      .mockReturnValueOnce({ select: getSelectCurrent })
      .mockReturnValueOnce({ select: getSelectLegacy });
    await expect(getSimulationById('sim-1')).rejects.toThrow('legacy get fail');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const createSingleCurrent = vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn });
    const createSingleLegacy = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('legacy create fail') });
    const createSelectCurrent = vi.fn().mockReturnValue({ single: createSingleCurrent });
    const createSelectLegacy = vi.fn().mockReturnValue({ single: createSingleLegacy });
    const createInsertCurrent = vi.fn().mockReturnValue({ select: createSelectCurrent });
    const createInsertLegacy = vi.fn().mockReturnValue({ select: createSelectLegacy });
    supabaseMocks.from
      .mockReturnValueOnce({ insert: createInsertCurrent })
      .mockReturnValueOnce({ insert: createInsertLegacy });
    await expect(
      createSimulationDraft({
        name: 'Sim',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 1,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 1,
      })
    ).rejects.toThrow('legacy create fail');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const updateSingleCurrent = vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn });
    const updateSingleLegacy = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('legacy update fail') });
    const updateSelectCurrent = vi.fn().mockReturnValue({ single: updateSingleCurrent });
    const updateSelectLegacy = vi.fn().mockReturnValue({ single: updateSingleLegacy });
    const updateEqUserCurrent = vi.fn().mockReturnValue({ select: updateSelectCurrent });
    const updateEqUserLegacy = vi.fn().mockReturnValue({ select: updateSelectLegacy });
    const updateEqIdCurrent = vi.fn().mockReturnValue({ eq: updateEqUserCurrent });
    const updateEqIdLegacy = vi.fn().mockReturnValue({ eq: updateEqUserLegacy });
    const updateCurrent = vi.fn().mockReturnValue({ eq: updateEqIdCurrent });
    const updateLegacy = vi.fn().mockReturnValue({ eq: updateEqIdLegacy });
    supabaseMocks.from
      .mockReturnValueOnce({ update: updateCurrent })
      .mockReturnValueOnce({ update: updateLegacy });
    await expect(
      updateSimulation('sim-1', {
        name: 'Sim',
        accountName: 'Cuenta 1',
        initialBalance: 1000,
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        weekdays: ['mon'],
        maxOperationsPerDay: 1,
        pctWin: 40,
        pctSl: 30,
        pctBreakeven: 20,
        pctNoTrade: 10,
        seed: 1,
      })
    ).rejects.toThrow('legacy update fail');
  });

  it('delete/listOps/replace/updateOp propagan errores directos y legacy', async () => {
    const missingColumn = new Error('column risk_pct does not exist');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const deleteEqUser = vi.fn().mockResolvedValueOnce({ error: new Error('delete fail') });
    const deleteEqId = vi.fn().mockReturnValue({ eq: deleteEqUser });
    const deleteFn = vi.fn().mockReturnValue({ eq: deleteEqId });
    supabaseMocks.from.mockReturnValueOnce({ delete: deleteFn });
    await expect(deleteSimulation('sim-1')).rejects.toThrow('delete fail');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const listOpsOrder = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('ops fail') });
    const listOpsEqUser = vi.fn().mockReturnValue({ order: listOpsOrder });
    const listOpsEqSim = vi.fn().mockReturnValue({ eq: listOpsEqUser });
    const listOpsSelect = vi.fn().mockReturnValue({ eq: listOpsEqSim });
    supabaseMocks.from.mockReturnValueOnce({ select: listOpsSelect });
    await expect(listSimulationOperations('sim-1')).rejects.toThrow('ops fail');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const delEqUser2 = vi.fn().mockResolvedValueOnce({ error: null });
    const delEqSim2 = vi.fn().mockReturnValue({ eq: delEqUser2 });
    const delFn2 = vi.fn().mockReturnValue({ eq: delEqSim2 });
    const insertSelectCurrent = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('insert hard fail') });
    const insertCurrent = vi.fn().mockReturnValue({ select: insertSelectCurrent });
    supabaseMocks.from
      .mockReturnValueOnce({ delete: delFn2 })
      .mockReturnValueOnce({ insert: insertCurrent });
    await expect(
      replaceSimulationOperations('sim-1', [{ operationDate: '2026-01-01', operationIndex: 1, side: 'buy', resultType: 'win', investedAmount: 1, technicalResultR: 1, monetaryResult: 1 }])
    ).rejects.toThrow('insert hard fail');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const delEqUser3 = vi.fn().mockResolvedValueOnce({ error: null });
    const delEqSim3 = vi.fn().mockReturnValue({ eq: delEqUser3 });
    const delFn3 = vi.fn().mockReturnValue({ eq: delEqSim3 });
    const insertSelectCurrent2 = vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn });
    const insertSelectLegacy2 = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('legacy insert fail') });
    const insertCurrent2 = vi.fn().mockReturnValue({ select: insertSelectCurrent2 });
    const insertLegacy2 = vi.fn().mockReturnValue({ select: insertSelectLegacy2 });
    supabaseMocks.from
      .mockReturnValueOnce({ delete: delFn3 })
      .mockReturnValueOnce({ insert: insertCurrent2 })
      .mockReturnValueOnce({ insert: insertLegacy2 });
    await expect(
      replaceSimulationOperations('sim-1', [{ operationDate: '2026-01-01', operationIndex: 1, side: 'buy', resultType: 'win', investedAmount: 1, technicalResultR: 1, monetaryResult: 1 }])
    ).rejects.toThrow('legacy insert fail');

    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const updateSingleCurrent = vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn });
    const updateSingleLegacy = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('legacy op update fail') });
    const updateSelectCurrent = vi.fn().mockReturnValue({ single: updateSingleCurrent });
    const updateSelectLegacy = vi.fn().mockReturnValue({ single: updateSingleLegacy });
    const updateEqUserCurrent = vi.fn().mockReturnValue({ select: updateSelectCurrent });
    const updateEqUserLegacy = vi.fn().mockReturnValue({ select: updateSelectLegacy });
    const updateEqSimCurrent = vi.fn().mockReturnValue({ eq: updateEqUserCurrent });
    const updateEqSimLegacy = vi.fn().mockReturnValue({ eq: updateEqUserLegacy });
    const updateEqIdCurrent = vi.fn().mockReturnValue({ eq: updateEqSimCurrent });
    const updateEqIdLegacy = vi.fn().mockReturnValue({ eq: updateEqSimLegacy });
    const updateCurrent = vi.fn().mockReturnValue({ eq: updateEqIdCurrent });
    const updateLegacy = vi.fn().mockReturnValue({ eq: updateEqIdLegacy });
    supabaseMocks.from
      .mockReturnValueOnce({ update: updateCurrent })
      .mockReturnValueOnce({ update: updateLegacy });
    await expect(updateSimulationOperation('sim-1', 'op-1', { side: 'buy' })).rejects.toThrow('legacy op update fail');
  });
});
