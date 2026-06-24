import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const auditMocks = vi.hoisted(() => ({
  logAuditActivity: vi.fn(),
}));

const rolesMocks = vi.hoisted(() => ({
  assertCurrentUserIsAdmin: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@services/audit', () => ({
  logAuditActivity: auditMocks.logAuditActivity,
}));

vi.mock('@services/roles', () => ({
  assertCurrentUserIsAdmin: rolesMocks.assertCurrentUserIsAdmin,
}));

vi.mock('@lib/supabase', () => ({
  supabase: {
    from: supabaseMocks.from,
    rpc: supabaseMocks.rpc,
  },
}));

import { useSystemConfig, DEFAULT_SYSTEM_CONFIG } from '@hooks/useSystemConfig';

describe('useSystemConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('MODE', 'production');
    localStorage.clear();

    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('carga configuración remota y actualiza el cache local', async () => {
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            key: 'accountTypes',
            value: [{ id: 'real', label: 'Real', value: 'real' }],
            updated_at: '2026-06-24T10:00:00.000Z',
          },
          {
            key: 'platforms',
            value: [{ id: 'mt5', label: 'MT5', value: 'mt5' }],
            updated_at: '2026-06-24T10:00:00.000Z',
          },
          {
            key: 'currencies',
            value: [{ id: 'USD', label: 'USD', value: 'USD' }],
            updated_at: '2026-06-24T10:00:00.000Z',
          },
        ],
        error: null,
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { result } = renderHook(() => useSystemConfig());

    await waitFor(() => {
      expect(result.current.config.accountTypes[0].value).toBe('real');
    });

    expect(localStorage.getItem('inversiones_system_config_cache')).toContain('accountTypes');
  });

  it('actualiza configuración y registra auditoría', async () => {
    supabaseMocks.rpc.mockResolvedValue({ error: null });
    rolesMocks.assertCurrentUserIsAdmin.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSystemConfig());

    const nextConfig = {
      ...DEFAULT_SYSTEM_CONFIG,
      accountTypes: [...DEFAULT_SYSTEM_CONFIG.accountTypes, { id: 'prop', label: 'Prop', value: 'prop' }],
    };

    await act(async () => {
      await result.current.updateConfig(nextConfig);
    });

    expect(auditMocks.logAuditActivity).toHaveBeenCalledWith(
      'system_config.update',
      expect.objectContaining({
        module: 'config',
        targetType: 'config',
        targetId: 'system',
        fieldsChanged: ['accountTypes'],
      })
    );
  });

  it('usa cache local por defecto cuando existe', () => {
    localStorage.setItem('inversiones_system_config_cache', JSON.stringify(DEFAULT_SYSTEM_CONFIG));

    const { result } = renderHook(() => useSystemConfig());

    expect(result.current.config).toEqual(DEFAULT_SYSTEM_CONFIG);
  });
});