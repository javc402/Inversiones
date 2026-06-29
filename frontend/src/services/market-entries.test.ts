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
  createMarketEntriesForAccounts,
  deleteMarketEntryById,
  listMarketEntriesByUser,
  listMostUsedMarketContexts,
  updateMarketEntryById,
} from '@services/market-entries';

describe('market-entries service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('lista entradas del usuario autenticado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: 'entry-1',
          group_id: 'group-1',
          account_id: 'acc-1',
          account_name: 'Cuenta 1',
          symbol: 'EURUSD',
          market_context: 'CPI',
          context_source: 'free_text',
          news_article_id: null,
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entry_price: 1.1,
          stop_loss: 1.09,
          take_profit: 1.12,
          risk_amount: 100,
          investment_percent: 1,
          result_r: null,
          no_entry_reason: null,
          note: '',
          status: 'planned',
          planned_at: '2026-06-29T10:00:00.000Z',
          created_at: '2026-06-29T10:00:00.000Z',
          updated_at: '2026-06-29T10:00:00.000Z',
        },
      ],
      error: null,
    });

    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ order: mockOrder });

    const rows = await listMarketEntriesByUser('user@example.com');

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('entry-1');
    expect(rows[0].accountName).toBe('Cuenta 1');
  });

  it('crea entradas en multiples cuentas', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockInsertSelect = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: 'entry-1',
          group_id: 'group-1',
          account_id: 'acc-1',
          account_name: 'Cuenta 1',
          symbol: 'EURUSD',
          market_context: 'CPI',
          context_source: 'free_text',
          news_article_id: null,
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entry_price: 1.1,
          stop_loss: 1.09,
          take_profit: 1.12,
          risk_amount: 100,
          investment_percent: 1,
          result_r: null,
          no_entry_reason: null,
          note: '',
          status: 'planned',
          planned_at: '2026-06-29T10:00:00.000Z',
          created_at: '2026-06-29T10:00:00.000Z',
          updated_at: '2026-06-29T10:00:00.000Z',
        },
      ],
      error: null,
    });
    const mockInsert = vi.fn().mockReturnValueOnce({ select: mockInsertSelect });

    supabaseMocks.from.mockReturnValueOnce({ insert: mockInsert });

    const created = await createMarketEntriesForAccounts('user@example.com', {
      common: {
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        setup: 'Breakout',
        session: 'NY',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.09,
        takeProfit: 1.12,
        note: '',
        plannedAt: '2026-06-29T10:00',
        status: 'planned',
      },
      perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
    });

    expect(created).toHaveLength(1);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('actualiza una entrada y aplica cambios al grupo', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'entry-1',
        group_id: 'group-1',
        account_id: 'acc-1',
        account_name: 'Cuenta 1',
        symbol: 'EURUSD',
        market_context: 'CPI',
        context_source: 'free_text',
        news_article_id: null,
        setup: 'Breakout',
        session: 'NY',
        direction: 'buy',
        entry_price: 1.1,
        stop_loss: 1.09,
        take_profit: 1.12,
        risk_amount: 100,
        investment_percent: 1,
        result_r: null,
        no_entry_reason: null,
        note: '',
        status: 'planned',
        planned_at: '2026-06-29T10:00:00.000Z',
        created_at: '2026-06-29T10:00:00.000Z',
        updated_at: '2026-06-29T10:00:00.000Z',
      },
      error: null,
    });

    const mockSelectPrevious = vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ single: mockSingle }) }) });

    const mockUpdateSelectEntry = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: 'entry-1',
          group_id: 'group-1',
          account_id: 'acc-1',
          account_name: 'Cuenta 1',
          symbol: 'EURUSD',
          market_context: 'CPI',
          context_source: 'free_text',
          news_article_id: null,
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entry_price: 1.1,
          stop_loss: 1.09,
          take_profit: 1.12,
          risk_amount: 100,
          investment_percent: 1,
          result_r: 1.2,
          no_entry_reason: null,
          note: 'ok',
          status: 'closed',
          planned_at: '2026-06-29T10:00:00.000Z',
          created_at: '2026-06-29T10:00:00.000Z',
          updated_at: '2026-06-29T11:00:00.000Z',
        },
      ],
      error: null,
    });
    const mockUpdateEntry = vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ select: mockUpdateSelectEntry }) }) });

    const mockUpdateSelectGroup = vi.fn().mockResolvedValueOnce({ data: [{ id: 'entry-1' }, { id: 'entry-2' }], error: null });
    const mockUpdateGroup = vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ select: mockUpdateSelectGroup }) }) });

    supabaseMocks.from
      .mockReturnValueOnce({ select: mockSelectPrevious })
      .mockReturnValueOnce({ update: mockUpdateEntry })
      .mockReturnValueOnce({ update: mockUpdateGroup });

    const result = await updateMarketEntryById(
      'user@example.com',
      'entry-1',
      { status: 'closed', riskAmount: 100, investmentPercent: 1, resultR: 1.2, note: 'ok' },
      { applyCommonToGroup: true }
    );

    expect(result.groupApplied).toBe(true);
    expect(result.affectedEntries).toBe(2);
    expect(result.updatedEntry.status).toBe('closed');
  });

  it('elimina una entrada existente', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockDeleteSelect = vi.fn().mockResolvedValueOnce({ data: [{ id: 'entry-1' }], error: null });
    const mockDelete = vi.fn().mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          select: mockDeleteSelect,
        }),
      }),
    });

    supabaseMocks.from.mockReturnValueOnce({ delete: mockDelete });

    await expect(deleteMarketEntryById('user@example.com', 'entry-1')).resolves.toBeUndefined();
  });

  it('retorna lista vacía cuando no hay usuario autenticado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const rows = await listMarketEntriesByUser('user@example.com');
    expect(rows).toEqual([]);
  });

  it('lista contextos más usados de tipo free_text', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const mockEqContext = vi.fn().mockResolvedValueOnce({
      data: [
        { market_context: 'CPI', context_source: 'free_text' },
        { market_context: 'CPI', context_source: 'free_text' },
        { market_context: 'NFP', context_source: 'free_text' },
      ],
      error: null,
    });
    const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqContext });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });

    const contexts = await listMostUsedMarketContexts('user@example.com', 5);
    expect(contexts[0]).toBe('CPI');
    expect(contexts).toContain('NFP');
  });

  it('valida create: contexto obligatorio', async () => {
    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          marketContext: ' ',
          contextSource: 'free_text',
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [],
      } as never)
    ).rejects.toThrow('El contexto/noticia es obligatorio.');
  });

  it('valida create: noticia requerida cuando context_source es news', async () => {
    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          marketContext: 'CPI',
          contextSource: 'news',
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [],
      } as never)
    ).rejects.toThrow('Debes seleccionar una noticia registrada.');
  });

  it('create no_entry inserta fila sin cuenta', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const mockInsertSelect = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: 'entry-1',
          group_id: 'group-1',
          account_id: null,
          account_name: null,
          symbol: '',
          market_context: 'CPI',
          context_source: 'free_text',
          news_article_id: null,
          setup: '',
          session: '',
          direction: null,
          entry_price: null,
          stop_loss: null,
          take_profit: null,
          risk_amount: null,
          investment_percent: null,
          result_r: null,
          no_entry_reason: 'No setup',
          note: '',
          status: 'no_entry',
          planned_at: '2026-06-29T10:00:00.000Z',
          created_at: '2026-06-29T10:00:00.000Z',
          updated_at: '2026-06-29T10:00:00.000Z',
        },
      ],
      error: null,
    });
    const mockInsert = vi.fn().mockReturnValueOnce({ select: mockInsertSelect });
    supabaseMocks.from.mockReturnValueOnce({ insert: mockInsert });

    const created = await createMarketEntriesForAccounts('user@example.com', {
      common: {
        symbol: '',
        marketContext: 'CPI',
        contextSource: 'free_text',
        setup: '',
        session: '',
        direction: 'buy',
        entryPrice: 1,
        stopLoss: 1,
        takeProfit: 1,
        note: '',
        plannedAt: '2026-06-29T10:00:00.000Z',
        status: 'no_entry',
        noEntryReason: 'No setup',
      },
      perAccount: [],
    });

    expect(created).toHaveLength(1);
    expect(created[0].status).toBe('no_entry');
  });

  it('create no_entry normaliza opcionales undefined a cadenas vacias', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockInsertSelect = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: 'entry-undef',
          group_id: 'group-1',
          account_id: null,
          account_name: null,
          symbol: '',
          market_context: 'CPI',
          context_source: 'free_text',
          news_article_id: null,
          setup: '',
          session: '',
          direction: null,
          entry_price: null,
          stop_loss: null,
          take_profit: null,
          risk_amount: null,
          investment_percent: null,
          result_r: null,
          no_entry_reason: 'Sin setup',
          note: '',
          status: 'no_entry',
          planned_at: '2026-06-29T10:00:00.000Z',
          created_at: '2026-06-29T10:00:00.000Z',
          updated_at: '2026-06-29T10:00:00.000Z',
        },
      ],
      error: null,
    });

    const mockInsert = vi.fn().mockReturnValueOnce({ select: mockInsertSelect });
    supabaseMocks.from.mockReturnValueOnce({ insert: mockInsert });

    await createMarketEntriesForAccounts('user@example.com', {
      common: {
        symbol: undefined,
        marketContext: 'CPI',
        contextSource: 'free_text',
        setup: undefined,
        session: undefined,
        direction: 'buy',
        entryPrice: 1,
        stopLoss: 1,
        takeProfit: 1,
        note: '',
        plannedAt: '2026-06-29T10:00:00.000Z',
        status: 'no_entry',
        noEntryReason: 'Sin setup',
      },
      perAccount: [],
    } as never);

    const payload = mockInsert.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(payload[0].symbol).toBe('');
    expect(payload[0].setup).toBe('');
    expect(payload[0].session).toBe('');
  });

  it('update falla cuando no existe entrada', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    const mockSingle = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('not found') });
    const mockSelectPrevious = vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ single: mockSingle }) }) });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelectPrevious });

    await expect(
      updateMarketEntryById('user@example.com', 'entry-1', {
        status: 'open',
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        note: 'x',
      })
    ).rejects.toThrow('No se encontró la entrada solicitada.');
  });

  it('delete falla cuando no hay filas afectadas', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockDeleteSelect = vi.fn().mockResolvedValueOnce({ data: [], error: null });
    const mockDelete = vi.fn().mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          select: mockDeleteSelect,
        }),
      }),
    });

    supabaseMocks.from.mockReturnValueOnce({ delete: mockDelete });

    await expect(deleteMarketEntryById('user@example.com', 'entry-1')).rejects.toThrow('No se encontró la entrada solicitada.');
  });

  it('listMostUsedMarketContexts retorna [] sin usuario autenticado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(listMostUsedMarketContexts('user@example.com')).resolves.toEqual([]);
  });

  it('create falla sin usuario autenticado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.09,
          takeProfit: 1.12,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
      })
    ).rejects.toThrow('No hay un usuario autenticado');
  });

  it('valida create: símbolo obligatorio cuando no es no_entry', async () => {
    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: ' ',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.09,
          takeProfit: 1.12,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
      })
    ).rejects.toThrow('El símbolo es obligatorio.');
  });

  it('valida create: cuentas no repetidas', async () => {
    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.09,
          takeProfit: 1.12,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [
          { accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 },
          { accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 },
        ],
      })
    ).rejects.toThrow('No puedes repetir la misma cuenta');
  });

  it('valida update: requiere motivo en no_entry', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'entry-1',
        group_id: 'group-1',
        account_id: 'acc-1',
        account_name: 'Cuenta 1',
        symbol: 'EURUSD',
        market_context: 'CPI',
        context_source: 'free_text',
        news_article_id: null,
        setup: 'Breakout',
        session: 'NY',
        direction: 'buy',
        entry_price: 1.1,
        stop_loss: 1.09,
        take_profit: 1.12,
        risk_amount: 100,
        investment_percent: 1,
        result_r: null,
        no_entry_reason: null,
        note: '',
        status: 'planned',
        planned_at: '2026-06-29T10:00:00.000Z',
        created_at: '2026-06-29T10:00:00.000Z',
        updated_at: '2026-06-29T10:00:00.000Z',
      },
      error: null,
    });

    const mockSelectPrevious = vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ single: mockSingle }) }) });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelectPrevious });

    await expect(
      updateMarketEntryById('user@example.com', 'entry-1', {
        status: 'no_entry',
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        note: 'x',
        noEntryReason: ' ',
      })
    ).rejects.toThrow('Debes indicar el motivo sin entrada.');
  });

  it('update falla cuando no hay usuario autenticado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    await expect(
      updateMarketEntryById('user@example.com', 'entry-1', {
        status: 'open',
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        note: 'x',
      })
    ).rejects.toThrow('No hay un usuario autenticado');
  });

  it('delete falla cuando no hay usuario autenticado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(deleteMarketEntryById('user@example.com', 'entry-1')).rejects.toThrow('No hay un usuario autenticado');
  });

  it('valida create: setup obligatorio', async () => {
    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: ' ',
          session: 'NY',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.09,
          takeProfit: 1.12,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
      })
    ).rejects.toThrow('El setup/estrategia es obligatorio.');
  });

  it('valida create: resultado R obligatorio cuando status es closed', async () => {
    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.09,
          takeProfit: 1.12,
          resultR: null,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'closed',
        },
        perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
      })
    ).rejects.toThrow('El Resultado R es obligatorio para entradas completadas.');
  });

  it('valida create: riesgo e inversión por cuenta mayores a 0', async () => {
    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.09,
          takeProfit: 1.12,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 0, investmentPercent: 1 }],
      })
    ).rejects.toThrow('El riesgo por cuenta debe ser mayor que 0.');

    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.09,
          takeProfit: 1.12,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 0 }],
      })
    ).rejects.toThrow('El % de inversión por cuenta debe ser mayor que 0.');
  });

  it('valida update: riesgo e inversión mayores a 0 para flujo normal', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'entry-1',
        group_id: 'group-1',
        account_id: 'acc-1',
        account_name: 'Cuenta 1',
        symbol: 'EURUSD',
        market_context: 'CPI',
        context_source: 'free_text',
        news_article_id: null,
        setup: 'Breakout',
        session: 'NY',
        direction: 'buy',
        entry_price: 1.1,
        stop_loss: 1.09,
        take_profit: 1.12,
        risk_amount: 100,
        investment_percent: 1,
        result_r: null,
        no_entry_reason: null,
        note: '',
        status: 'open',
        planned_at: '2026-06-29T10:00:00.000Z',
        created_at: '2026-06-29T10:00:00.000Z',
        updated_at: '2026-06-29T10:00:00.000Z',
      },
      error: null,
    });

    const mockSelectPrevious = vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ single: mockSingle }) }) });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelectPrevious });

    await expect(
      updateMarketEntryById('user@example.com', 'entry-1', {
        status: 'open',
        riskAmount: 0,
        investmentPercent: 1,
        resultR: null,
        note: 'x',
      })
    ).rejects.toThrow('El riesgo debe ser mayor que 0.');
  });

  it('update falla cuando update principal no afecta filas', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'entry-1',
        group_id: 'group-1',
        account_id: 'acc-1',
        account_name: 'Cuenta 1',
        symbol: 'EURUSD',
        market_context: 'CPI',
        context_source: 'free_text',
        news_article_id: null,
        setup: 'Breakout',
        session: 'NY',
        direction: 'buy',
        entry_price: 1.1,
        stop_loss: 1.09,
        take_profit: 1.12,
        risk_amount: 100,
        investment_percent: 1,
        result_r: null,
        no_entry_reason: null,
        note: '',
        status: 'open',
        planned_at: '2026-06-29T10:00:00.000Z',
        created_at: '2026-06-29T10:00:00.000Z',
        updated_at: '2026-06-29T10:00:00.000Z',
      },
      error: null,
    });

    const mockSelectPrevious = vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ single: mockSingle }) }) });
    const mockUpdateEntry = vi.fn().mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockResolvedValueOnce({ data: [], error: null }),
        }),
      }),
    });

    supabaseMocks.from
      .mockReturnValueOnce({ select: mockSelectPrevious })
      .mockReturnValueOnce({ update: mockUpdateEntry });

    await expect(
      updateMarketEntryById('user@example.com', 'entry-1', {
        status: 'open',
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        note: 'x',
      })
    ).rejects.toThrow('No se pudo actualizar la entrada solicitada.');
  });

  it('delete propaga error de base de datos', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockDelete = vi.fn().mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockResolvedValueOnce({ data: null, error: new Error('delete fail') }),
        }),
      }),
    });

    supabaseMocks.from.mockReturnValueOnce({ delete: mockDelete });

    await expect(deleteMarketEntryById('user@example.com', 'entry-1')).rejects.toThrow('delete fail');
  });

  it('listMostUsedMarketContexts ignora contextos vacíos y respeta límite mínimo', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockEqContext = vi.fn().mockResolvedValueOnce({
      data: [
        { market_context: ' CPI ', context_source: 'free_text' },
        { market_context: ' ', context_source: 'free_text' },
        { market_context: null, context_source: 'free_text' },
      ],
      error: null,
    });
    const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqContext });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });

    const contexts = await listMostUsedMarketContexts('user@example.com', 0);
    expect(contexts).toEqual(['CPI']);
  });

  it('listMostUsedMarketContexts propaga error de consulta', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockEqContext = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('contexts fail') });
    const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqContext });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });

    await expect(listMostUsedMarketContexts('user@example.com')).rejects.toThrow('contexts fail');
  });

  it('valida create: sesión, dirección y precios obligatorios', async () => {
    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: 'Breakout',
          session: ' ',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.09,
          takeProfit: 1.12,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
      })
    ).rejects.toThrow('La sesión es obligatoria.');

    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: 'Breakout',
          session: 'NY',
          direction: undefined,
          entryPrice: 1.1,
          stopLoss: 1.09,
          takeProfit: 1.12,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
      } as never)
    ).rejects.toThrow('La dirección es obligatoria.');

    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entryPrice: 0,
          stopLoss: 1.09,
          takeProfit: 1.12,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
      })
    ).rejects.toThrow('Precio de entrada inválido.');

    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 0,
          takeProfit: 1.12,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
      })
    ).rejects.toThrow('Stop loss inválido.');

    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.09,
          takeProfit: 0,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
      })
    ).rejects.toThrow('Take profit inválido.');
  });

  it('create para contexto news mantiene newsArticleId y normaliza cuenta', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockInsertSelect = vi.fn().mockResolvedValueOnce({ data: [], error: null });
    const mockInsert = vi.fn().mockReturnValueOnce({ select: mockInsertSelect });
    supabaseMocks.from.mockReturnValueOnce({ insert: mockInsert });

    await createMarketEntriesForAccounts('user@example.com', {
      common: {
        symbol: ' eurusd ',
        marketContext: 'CPI',
        contextSource: 'news',
        newsArticleId: 'news-1',
        setup: 'Breakout',
        session: 'NY',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.09,
        takeProfit: 1.12,
        note: 'x',
        plannedAt: '2026-06-29T10:00',
        status: 'planned',
      },
      perAccount: [{ accountId: 'acc-1', accountName: ' Cuenta 1 ', riskAmount: 100, investmentPercent: 1 }],
    });

    const payload = mockInsert.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(payload[0].news_article_id).toBe('news-1');
    expect(payload[0].symbol).toBe('EURUSD');
    expect(payload[0].account_name).toBe('Cuenta 1');
  });

  it('create genera groupId con Date.now cuando randomUUID no está disponible', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const originalRandomUUID = globalThis.crypto.randomUUID;
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
    });

    const mockInsertSelect = vi.fn().mockResolvedValueOnce({ data: [], error: null });
    const mockInsert = vi.fn().mockReturnValueOnce({ select: mockInsertSelect });
    supabaseMocks.from.mockReturnValueOnce({ insert: mockInsert });

    await createMarketEntriesForAccounts('user@example.com', {
      common: {
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        setup: 'Breakout',
        session: 'NY',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.09,
        takeProfit: 1.12,
        note: '',
        plannedAt: '2026-06-29T10:00',
        status: 'planned',
      },
      perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
    });

    const payload = mockInsert.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(payload[0].group_id).toBe('group-1234567890');

    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: originalRandomUUID,
      configurable: true,
    });
    dateSpy.mockRestore();
  });

  it('valida create no_entry: exige motivo sin entrada', async () => {
    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: '',
          marketContext: 'CPI',
          contextSource: 'free_text',
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'no_entry',
          noEntryReason: ' ',
        },
        perAccount: [],
      } as never)
    ).rejects.toThrow('Debes indicar el motivo sin entrada.');
  });

  it('valida create: exige al menos una cuenta cuando no es no_entry', async () => {
    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.09,
          takeProfit: 1.12,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [],
      })
    ).rejects.toThrow('Debes asociar al menos una cuenta.');
  });

  it('valida create: cada fila debe tener cuenta asociada', async () => {
    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.09,
          takeProfit: 1.12,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [{ accountId: '', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
      })
    ).rejects.toThrow('Cada fila debe tener cuenta asociada.');
  });

  it('valida update: inversión mayor a 0 para flujo normal', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'entry-1', group_id: 'group-1', account_id: 'acc-1', account_name: 'Cuenta 1', symbol: 'EURUSD',
        market_context: 'CPI', context_source: 'free_text', news_article_id: null, setup: 'Breakout', session: 'NY',
        direction: 'buy', entry_price: 1.1, stop_loss: 1.09, take_profit: 1.12, risk_amount: 100, investment_percent: 1,
        result_r: null, no_entry_reason: null, note: '', status: 'open', planned_at: '2026-06-29T10:00:00.000Z',
        created_at: '2026-06-29T10:00:00.000Z', updated_at: '2026-06-29T10:00:00.000Z',
      },
      error: null,
    });

    const mockSelectPrevious = vi.fn().mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ single: mockSingle }) }),
    });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelectPrevious });

    await expect(
      updateMarketEntryById('user@example.com', 'entry-1', {
        status: 'open',
        riskAmount: 100,
        investmentPercent: 0,
        resultR: null,
        note: 'x',
      })
    ).rejects.toThrow('El % de inversión debe ser mayor que 0.');
  });

  it('update no_entry limpia motivo si cambia a estado normal', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'entry-1', group_id: 'group-1', account_id: null, account_name: null,
        symbol: 'EURUSD', market_context: 'CPI', context_source: 'free_text', news_article_id: null,
        setup: 'Breakout', session: 'NY', direction: null, entry_price: null, stop_loss: null, take_profit: null,
        risk_amount: null, investment_percent: null, result_r: null, no_entry_reason: 'skip', note: '',
        status: 'no_entry', planned_at: '2026-06-29T10:00:00.000Z', created_at: '2026-06-29T10:00:00.000Z', updated_at: '2026-06-29T10:00:00.000Z',
      },
      error: null,
    });

    const mockSelectPrevious = vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ single: mockSingle }) }) });
    const mockUpdateSelect = vi.fn().mockResolvedValueOnce({
      data: [{
        id: 'entry-1', group_id: 'group-1', account_id: null, account_name: null,
        symbol: 'EURUSD', market_context: 'CPI', context_source: 'free_text', news_article_id: null,
        setup: 'Breakout', session: 'NY', direction: null, entry_price: null, stop_loss: null, take_profit: null,
        risk_amount: null, investment_percent: null, result_r: null, no_entry_reason: null, note: 'ok',
        status: 'open', planned_at: '2026-06-29T10:00:00.000Z', created_at: '2026-06-29T10:00:00.000Z', updated_at: '2026-06-29T11:00:00.000Z',
      }],
      error: null,
    });
    const mockUpdateEntry = vi.fn().mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ select: mockUpdateSelect }) }),
    });

    supabaseMocks.from
      .mockReturnValueOnce({ select: mockSelectPrevious })
      .mockReturnValueOnce({ update: mockUpdateEntry });

    const result = await updateMarketEntryById('user@example.com', 'entry-1', {
      status: 'open',
      riskAmount: 100,
      investmentPercent: 1,
      resultR: null,
      note: 'ok',
    });

    expect(result.updatedEntry.noEntryReason).toBeNull();
  });

  it('update con applyCommonToGroup lanza si falla update grupal', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const previous = {
      id: 'entry-1', group_id: 'group-1', account_id: 'acc-1', account_name: 'Cuenta 1',
      symbol: 'EURUSD', market_context: 'CPI', context_source: 'free_text', news_article_id: null,
      setup: 'Breakout', session: 'NY', direction: 'buy', entry_price: 1.1, stop_loss: 1.09, take_profit: 1.12,
      risk_amount: 100, investment_percent: 1, result_r: null, no_entry_reason: null, note: '', status: 'planned',
      planned_at: '2026-06-29T10:00:00.000Z', created_at: '2026-06-29T10:00:00.000Z', updated_at: '2026-06-29T10:00:00.000Z',
    };

    const mockSelectPrevious = vi.fn().mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ single: vi.fn().mockResolvedValueOnce({ data: previous, error: null }) }) }),
    });

    const mockUpdateSelect = vi.fn().mockResolvedValueOnce({ data: [previous], error: null });
    const mockUpdateEntry = vi.fn().mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ select: mockUpdateSelect }) }),
    });

    const mockUpdateGroup = vi.fn().mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ select: vi.fn().mockResolvedValueOnce({ data: null, error: new Error('group fail') }) }) }),
    });

    supabaseMocks.from
      .mockReturnValueOnce({ select: mockSelectPrevious })
      .mockReturnValueOnce({ update: mockUpdateEntry })
      .mockReturnValueOnce({ update: mockUpdateGroup });

    await expect(
      updateMarketEntryById(
        'user@example.com',
        'entry-1',
        { status: 'closed', riskAmount: 100, investmentPercent: 1, resultR: 1, note: 'ok' },
        { applyCommonToGroup: true }
      )
    ).rejects.toThrow('No se pudieron aplicar cambios al grupo.');
  });

  it('create propaga error cuando insert falla', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockInsertSelect = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('insert fail') });
    const mockInsert = vi.fn().mockReturnValueOnce({ select: mockInsertSelect });
    supabaseMocks.from.mockReturnValueOnce({ insert: mockInsert });

    await expect(
      createMarketEntriesForAccounts('user@example.com', {
        common: {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.09,
          takeProfit: 1.12,
          note: '',
          plannedAt: '2026-06-29T10:00',
          status: 'planned',
        },
        perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
      })
    ).rejects.toThrow('insert fail');
  });

  it('create retorna [] cuando insert no devuelve filas', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockInsertSelect = vi.fn().mockResolvedValueOnce({ data: null, error: null });
    const mockInsert = vi.fn().mockReturnValueOnce({ select: mockInsertSelect });
    supabaseMocks.from.mockReturnValueOnce({ insert: mockInsert });

    const result = await createMarketEntriesForAccounts('user@example.com', {
      common: {
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        setup: 'Breakout',
        session: 'NY',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.09,
        takeProfit: 1.12,
        note: '',
        plannedAt: '2026-06-29T10:00',
        status: 'planned',
      },
      perAccount: [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
    });

    expect(result).toEqual([]);
  });

  it('update no_entry usa noEntryReason recibido y recortado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'entry-1', group_id: 'group-1', account_id: null, account_name: null,
        symbol: 'EURUSD', market_context: 'CPI', context_source: 'free_text', news_article_id: null,
        setup: 'Breakout', session: 'NY', direction: null, entry_price: null, stop_loss: null, take_profit: null,
        risk_amount: null, investment_percent: null, result_r: null, no_entry_reason: 'prev-reason', note: '',
        status: 'no_entry', planned_at: '2026-06-29T10:00:00.000Z', created_at: '2026-06-29T10:00:00.000Z', updated_at: '2026-06-29T10:00:00.000Z',
      },
      error: null,
    });

    const mockSelectPrevious = vi.fn().mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ single: mockSingle }) }),
    });
    const mockUpdateSelect = vi.fn().mockResolvedValueOnce({
      data: [{
        id: 'entry-1', group_id: 'group-1', account_id: null, account_name: null,
        symbol: 'EURUSD', market_context: 'CPI', context_source: 'free_text', news_article_id: null,
        setup: 'Breakout', session: 'NY', direction: null, entry_price: null, stop_loss: null, take_profit: null,
        risk_amount: null, investment_percent: null, result_r: null, no_entry_reason: 'new reason', note: 'ok',
        status: 'no_entry', planned_at: '2026-06-29T10:00:00.000Z', created_at: '2026-06-29T10:00:00.000Z', updated_at: '2026-06-29T11:00:00.000Z',
      }],
      error: null,
    });
    const mockUpdateEntry = vi.fn().mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ select: mockUpdateSelect }) }),
    });

    supabaseMocks.from
      .mockReturnValueOnce({ select: mockSelectPrevious })
      .mockReturnValueOnce({ update: mockUpdateEntry });

    const result = await updateMarketEntryById('user@example.com', 'entry-1', {
      status: 'no_entry',
      riskAmount: 0,
      investmentPercent: 0,
      resultR: null,
      note: 'ok',
      noEntryReason: '  new reason  ',
    });

    expect(result.updatedEntry.noEntryReason).toBe('new reason');
  });

  it('update con applyCommonToGroup usa affectedEntries=0 si query grupal retorna null', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const previous = {
      id: 'entry-1', group_id: 'group-1', account_id: 'acc-1', account_name: 'Cuenta 1',
      symbol: 'EURUSD', market_context: 'CPI', context_source: 'free_text', news_article_id: null,
      setup: 'Breakout', session: 'NY', direction: 'buy', entry_price: 1.1, stop_loss: 1.09, take_profit: 1.12,
      risk_amount: 100, investment_percent: 1, result_r: null, no_entry_reason: null, note: '', status: 'planned',
      planned_at: '2026-06-29T10:00:00.000Z', created_at: '2026-06-29T10:00:00.000Z', updated_at: '2026-06-29T10:00:00.000Z',
    };

    const mockSelectPrevious = vi.fn().mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ single: vi.fn().mockResolvedValueOnce({ data: previous, error: null }) }) }),
    });

    const mockUpdateSelect = vi.fn().mockResolvedValueOnce({ data: [previous], error: null });
    const mockUpdateEntry = vi.fn().mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ select: mockUpdateSelect }) }),
    });

    const mockUpdateGroup = vi.fn().mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ select: vi.fn().mockResolvedValueOnce({ data: null, error: null }) }) }),
    });

    supabaseMocks.from
      .mockReturnValueOnce({ select: mockSelectPrevious })
      .mockReturnValueOnce({ update: mockUpdateEntry })
      .mockReturnValueOnce({ update: mockUpdateGroup });

    const result = await updateMarketEntryById(
      'user@example.com',
      'entry-1',
      { status: 'closed', riskAmount: 100, investmentPercent: 1, resultR: 1, note: 'ok' },
      { applyCommonToGroup: true }
    );

    expect(result.affectedEntries).toBe(0);
    expect(result.groupApplied).toBe(true);
  });
});
