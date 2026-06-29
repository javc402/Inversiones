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
});
