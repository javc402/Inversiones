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
  createTradingAccount,
  listTradingAccounts,
  toggleTradingAccountStatus,
  updateTradingAccount,
} from '@services/accounts';

describe('accounts service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('listTradingAccounts retorna cuentas del usuario autenticado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValueOnce({
      data: [{ id: 'acc-1', user_id: 'user-1', name: 'Cuenta 1' }],
      error: null,
    });
    const mockInsertLog = vi.fn().mockResolvedValueOnce({ error: null });

    supabaseMocks.from
      .mockReturnValueOnce({ select: mockSelect })
      .mockReturnValueOnce({ insert: mockInsertLog });

    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ order: mockOrder });

    const result = await listTradingAccounts();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('acc-1');
  });

  it('createTradingAccount inserta payload y log', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockInsertAccount = vi.fn().mockResolvedValueOnce({ error: null });

    supabaseMocks.from.mockImplementation((table: string) => {
      if (table === 'trading_accounts') {
        return { insert: mockInsertAccount };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    await createTradingAccount({
      name: 'Cuenta A',
      broker_name: 'Broker',
      account_type: 'real',
      platform: 'mt5',
      base_currency: 'USD',
      initial_balance: 1000,
      opened_at: '2026-06-23',
      status: 'active',
    });

    expect(mockInsertAccount).toHaveBeenCalled();
  });

  it('updateTradingAccount actualiza por id', async () => {
    const mockSingle = vi.fn().mockResolvedValueOnce({ data: { account_type: 'real' }, error: null });
    const mockEqSelect = vi.fn().mockReturnValueOnce({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValueOnce({ eq: mockEqSelect });
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEqUpdate = vi.fn().mockResolvedValueOnce({ error: null });

    supabaseMocks.from.mockImplementation((table: string) => {
      if (table === 'trading_accounts') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    mockUpdate.mockReturnValueOnce({ eq: mockEqUpdate });

    await updateTradingAccount('acc-1', {
      name: 'Cuenta A',
      broker_name: 'Broker',
      account_type: 'demo',
      platform: 'mt4',
      base_currency: 'USD',
      initial_balance: 900,
      opened_at: '2026-06-23',
      status: 'inactive',
    });

    expect(mockEqUpdate).toHaveBeenCalledWith('id', 'acc-1');
  });

  it('toggleTradingAccountStatus cambia estado', async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValueOnce({ error: null });

    supabaseMocks.from.mockImplementation((table: string) => {
      if (table === 'trading_accounts') {
        return { update: mockUpdate };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    mockUpdate.mockReturnValueOnce({ eq: mockEq });

    const next = await toggleTradingAccountStatus('acc-1', 'active');

    expect(next).toBe('inactive');
    expect(mockEq).toHaveBeenCalledWith('id', 'acc-1');
  });
});
