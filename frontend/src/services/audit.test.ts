import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@lib/supabase';
import { detectChanges, logAuditActivity, logChangesWithStandardFormat } from '@services/audit';

vi.mock('@lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('audit service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('MODE', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('detectChanges devuelve solo los campos modificados', () => {
    const changes = detectChanges(
      { name: 'Cuenta 1', balance: 1000, status: 'active' },
      { name: 'Cuenta 2', balance: 1000, status: 'inactive' },
      ['name', 'balance', 'status']
    );

    expect(changes).toEqual([
      { field: 'name', before: 'Cuenta 1', after: 'Cuenta 2' },
      { field: 'status', before: 'active', after: 'inactive' },
    ]);
  });

  it('logAuditActivity inserta metadata limpia con source por defecto', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const insert = vi.fn().mockResolvedValueOnce({ error: null });
    vi.mocked(supabase.from).mockReturnValueOnce({ insert } as never);

    await logAuditActivity('accounts.update', {
      module: 'accounts',
      targetType: 'account',
      targetId: 'acc-1',
      fieldsChanged: ['name'],
      changeDetails: [{ field: 'name', before: 'A', after: 'B' }],
      extra: undefined,
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        action: 'accounts.update',
        target_user_id: null,
        metadata: expect.objectContaining({
          source: 'frontend',
          module: 'accounts',
          targetType: 'account',
          targetId: 'acc-1',
          fieldsChanged: ['name'],
        }),
      })
    );
  });

  it('logChangesWithStandardFormat no registra cuando no hay cambios', async () => {
    await logChangesWithStandardFormat('accounts.update', 'accounts', 'account', 'acc-1', []);

    expect(supabase.from).not.toHaveBeenCalled();
  });
});
