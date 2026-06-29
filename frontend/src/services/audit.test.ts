import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
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
      data: { user: { id: 'user-1' } as any },
      error: null,
    } as any);

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

  it('detectChanges ignora campos no presentes y normaliza undefined a null', () => {
    const changes = detectChanges(
      { note: 'a', other: 1 },
      { note: undefined, another: 'x' },
      ['note', 'missing']
    );

    expect(changes).toEqual([{ field: 'note', before: 'a', after: null }]);
  });

  it('logAuditActivity no hace nada en modo test', async () => {
    vi.stubEnv('MODE', 'test');

    await logAuditActivity('accounts.update', {
      module: 'accounts',
      targetType: 'account',
      fieldsChanged: ['name'],
    });

    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it('logAuditActivity no inserta si no hay usuario', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({ data: { user: null } as any, error: null } as any);

    await logAuditActivity('accounts.update', {
      module: 'accounts',
      targetType: 'account',
      fieldsChanged: ['name'],
    });

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('logAuditActivity conserva source enviado y registra error de insert', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: 'user-1' } as any },
      error: null,
    } as any);

    const insert = vi.fn().mockResolvedValueOnce({ error: new Error('insert fail') });
    vi.mocked(supabase.from).mockReturnValueOnce({ insert } as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await logAuditActivity('accounts.update', {
      source: 'backend',
      module: 'accounts',
      targetType: 'account',
      fieldsChanged: ['name'],
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ source: 'backend' }),
      })
    );
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('logChangesWithStandardFormat registra cambios y metadatos adicionales', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: 'user-1' } as any },
      error: null,
    } as any);
    const insert = vi.fn().mockResolvedValueOnce({ error: null });
    vi.mocked(supabase.from).mockReturnValueOnce({ insert } as never);

    await logChangesWithStandardFormat(
      'accounts.update',
      'accounts',
      'account',
      'acc-1',
      [{ field: 'name', before: 'a', after: 'b' }],
      { extraMeta: true }
    );

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          fieldsChanged: ['name'],
          extraMeta: true,
        }),
      })
    );
  });
});
