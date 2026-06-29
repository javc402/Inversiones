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
});
