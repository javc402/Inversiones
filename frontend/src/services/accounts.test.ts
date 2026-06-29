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
  toggleTradingAccountFavorite,
  toggleTradingAccountStatus,
  updateTradingAccount,
} from '@services/accounts';

describe('accounts service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table === 'activity_logs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }

      return {
        select: vi.fn(),
        update: vi.fn(),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });
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

  it('listTradingAccounts retorna [] si no hay usuario autenticado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const result = await listTradingAccounts();
    expect(result).toEqual([]);
  });

  it('listTradingAccounts lanza error de base de datos', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('db error') });

    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ order: mockOrder });

    await expect(listTradingAccounts()).rejects.toThrow('db error');
  });

  it('createTradingAccount falla sin usuario autenticado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    await expect(
      createTradingAccount({
        name: 'Cuenta A',
        broker_name: 'Broker',
        account_type: 'real',
        platform: 'mt5',
        base_currency: 'USD',
        initial_balance: 1000,
        opened_at: '2026-06-23',
        status: 'active',
      })
    ).rejects.toThrow('No hay un usuario autenticado');
  });

  it('createTradingAccount lanza error al insertar', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    supabaseMocks.from.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValueOnce({ error: new Error('insert error') }),
    });

    await expect(
      createTradingAccount({
        name: 'Cuenta A',
        broker_name: 'Broker',
        account_type: 'real',
        platform: 'mt5',
        base_currency: 'USD',
        initial_balance: 1000,
        opened_at: '2026-06-23',
        status: 'active',
      })
    ).rejects.toThrow('insert error');
  });

  it('updateTradingAccount falla si no existe cuenta previa', async () => {
    const mockSingle = vi.fn().mockResolvedValueOnce({ data: null, error: null });
    const mockSelect = vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ single: mockSingle }) });

    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });

    await expect(
      updateTradingAccount('acc-1', {
        name: 'Cuenta A',
        broker_name: 'Broker',
        account_type: 'demo',
        platform: 'mt4',
        base_currency: 'USD',
        initial_balance: 900,
        opened_at: '2026-06-23',
        status: 'inactive',
      })
    ).rejects.toThrow('Account not found');
  });

  it('updateTradingAccount lanza error al actualizar', async () => {
    const mockSingle = vi.fn().mockResolvedValueOnce({ data: { id: 'acc-1', account_type: 'real' }, error: null });
    const mockSelect = vi.fn().mockReturnValueOnce({ eq: vi.fn().mockReturnValueOnce({ single: mockSingle }) });
    const mockUpdate = vi.fn().mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: new Error('update error') }) });

    supabaseMocks.from
      .mockReturnValueOnce({ select: mockSelect })
      .mockReturnValueOnce({ update: mockUpdate });

    await expect(
      updateTradingAccount('acc-1', {
        name: 'Cuenta A',
        broker_name: 'Broker',
        account_type: 'demo',
        platform: 'mt4',
        base_currency: 'USD',
        initial_balance: 900,
        opened_at: '2026-06-23',
        status: 'inactive',
      })
    ).rejects.toThrow('update error');
  });

  it('toggleTradingAccountStatus desde inactive pasa a active', async () => {
    const mockUpdate = vi.fn().mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: null }) });

    supabaseMocks.from
      .mockReturnValueOnce({ update: mockUpdate })
      .mockReturnValueOnce({ insert: vi.fn().mockResolvedValue({ error: null }) });

    const next = await toggleTradingAccountStatus('acc-1', 'inactive');
    expect(next).toBe('active');
  });

  it('toggleTradingAccountFavorite invierte valor y propaga error', async () => {
    const mockUpdateOk = vi.fn().mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: null }) });
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table === 'trading_accounts') return { update: mockUpdateOk };
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    const fav = await toggleTradingAccountFavorite('acc-1', false);
    expect(fav).toBe(true);

    const mockUpdateFail = vi.fn().mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: new Error('fav error') }) });
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table === 'trading_accounts') return { update: mockUpdateFail };
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    await expect(toggleTradingAccountFavorite('acc-1', true)).rejects.toThrow('fav error');
  });
});
