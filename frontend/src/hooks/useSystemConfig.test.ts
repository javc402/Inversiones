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

  it('ignora cache local inválido y usa defaults', () => {
    localStorage.setItem('inversiones_system_config_cache', '{invalid-json');

    const { result } = renderHook(() => useSystemConfig());

    expect(result.current.config.accountTypes.length).toBeGreaterThan(0);
  });

  it('en modo test updateConfig no exige rol admin ni persiste remoto', async () => {
    vi.stubEnv('MODE', 'test');
    const { result } = renderHook(() => useSystemConfig());

    await act(async () => {
      await result.current.updateConfig(DEFAULT_SYSTEM_CONFIG);
    });

    expect(rolesMocks.assertCurrentUserIsAdmin).not.toHaveBeenCalled();
    expect(supabaseMocks.rpc).not.toHaveBeenCalled();
  });

  it('si RPC falla, usa fallback upsert', async () => {
    vi.stubEnv('MODE', 'production');
    rolesMocks.assertCurrentUserIsAdmin.mockResolvedValue(undefined);
    supabaseMocks.rpc.mockResolvedValueOnce({ error: new Error('rpc fail') });

    const upsertMock = vi.fn().mockResolvedValueOnce({ error: null });
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      upsert: upsertMock,
    });

    const { result } = renderHook(() => useSystemConfig());

    await act(async () => {
      await result.current.updateConfig(DEFAULT_SYSTEM_CONFIG);
    });

    expect(upsertMock).toHaveBeenCalled();
  });

  it('lanza error cuando RPC y upsert fallan', async () => {
    vi.stubEnv('MODE', 'production');
    rolesMocks.assertCurrentUserIsAdmin.mockResolvedValue(undefined);
    supabaseMocks.rpc.mockResolvedValueOnce({ error: new Error('rpc fail') });

    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      upsert: vi.fn().mockResolvedValueOnce({ error: new Error('upsert fail') }),
    });

    const { result } = renderHook(() => useSystemConfig());

    await expect(result.current.updateConfig(DEFAULT_SYSTEM_CONFIG)).rejects.toThrow(
      'No se pudo guardar la configuración en este momento. Intenta de nuevo.'
    );
  });

  it('fetch remoto conserva cache local si timestamp local es más nuevo', async () => {
    const localConfig = {
      ...DEFAULT_SYSTEM_CONFIG,
      accountTypes: [{ id: 'x', label: 'X', value: 'x' }],
    };
    localStorage.setItem('inversiones_system_config_cache', JSON.stringify(localConfig));
    localStorage.setItem('inversiones_system_config_cache_ts', String(Date.now() + 100000));

    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          { key: 'accountTypes', value: [{ id: 'real', label: 'Real', value: 'real' }], updated_at: '2020-01-01T00:00:00.000Z' },
          { key: 'platforms', value: [{ id: 'mt5', label: 'MT5', value: 'mt5' }], updated_at: '2020-01-01T00:00:00.000Z' },
          { key: 'currencies', value: [{ id: 'USD', label: 'USD', value: 'USD' }], updated_at: '2020-01-01T00:00:00.000Z' },
        ],
        error: null,
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { result } = renderHook(() => useSystemConfig());

    await waitFor(() => {
      expect(result.current.config.accountTypes[0].value).toBe('x');
    });
  });

  it('usa defaults parciales cuando remoto trae arreglos vacíos o inválidos', async () => {
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          { key: 'accountTypes', value: [], updated_at: '2026-06-24T10:00:00.000Z' },
          { key: 'platforms', value: 'invalid', updated_at: '2026-06-24T10:00:00.000Z' },
          { key: 'currencies', value: [{ id: 'usd', label: 'USD', value: 'USD' }], updated_at: '2026-06-24T10:00:00.000Z' },
        ],
        error: null,
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { result } = renderHook(() => useSystemConfig());

    await waitFor(() => {
      expect(result.current.config.currencies[0].value).toBe('USD');
    });

    expect(result.current.config.accountTypes).toEqual(DEFAULT_SYSTEM_CONFIG.accountTypes);
    expect(result.current.config.platforms).toEqual(DEFAULT_SYSTEM_CONFIG.platforms);
  });

  it('ignora respuesta remota cuando data no es arreglo', async () => {
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { result } = renderHook(() => useSystemConfig());

    await waitFor(() => {
      expect(result.current.config.accountTypes.length).toBeGreaterThan(0);
    });
  });

  it('si local timestamp no es numérico, usa remoto', async () => {
    localStorage.setItem('inversiones_system_config_cache', JSON.stringify({
      ...DEFAULT_SYSTEM_CONFIG,
      accountTypes: [{ id: 'local', label: 'Local', value: 'local' }],
    }));
    localStorage.setItem('inversiones_system_config_cache_ts', 'not-a-number');

    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          { key: 'accountTypes', value: [{ id: 'real', label: 'Real', value: 'real' }], updated_at: '2026-06-24T10:00:00.000Z' },
          { key: 'platforms', value: [{ id: 'mt5', label: 'MT5', value: 'mt5' }], updated_at: '2026-06-24T10:00:00.000Z' },
          { key: 'currencies', value: [{ id: 'USD', label: 'USD', value: 'USD' }], updated_at: '2026-06-24T10:00:00.000Z' },
        ],
        error: null,
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { result } = renderHook(() => useSystemConfig());

    await waitFor(() => {
      expect(result.current.config.accountTypes[0].value).toBe('real');
    });
  });

  it('si rpc lanza excepción, intenta fallback upsert', async () => {
    vi.stubEnv('MODE', 'production');
    rolesMocks.assertCurrentUserIsAdmin.mockResolvedValue(undefined);
    supabaseMocks.rpc.mockRejectedValueOnce(new Error('rpc exploded'));

    const upsertMock = vi.fn().mockResolvedValueOnce({ error: null });
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      upsert: upsertMock,
    });

    const { result } = renderHook(() => useSystemConfig());

    await act(async () => {
      await result.current.updateConfig(DEFAULT_SYSTEM_CONFIG);
    });

    expect(upsertMock).toHaveBeenCalled();
  });

  it('si upsert lanza excepción, updateConfig lanza error final', async () => {
    vi.stubEnv('MODE', 'production');
    rolesMocks.assertCurrentUserIsAdmin.mockResolvedValue(undefined);
    supabaseMocks.rpc.mockResolvedValueOnce({ error: new Error('rpc fail') });

    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      upsert: vi.fn().mockRejectedValueOnce(new Error('upsert exploded')),
    });

    const { result } = renderHook(() => useSystemConfig());

    await expect(result.current.updateConfig(DEFAULT_SYSTEM_CONFIG)).rejects.toThrow(
      'No se pudo guardar la configuración en este momento. Intenta de nuevo.'
    );
  });

  it('si getItem falla al cargar cache local, usa defaults', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('read failed');
    });

    const { result } = renderHook(() => useSystemConfig());

    expect(result.current.config).toEqual(DEFAULT_SYSTEM_CONFIG);
    getItemSpy.mockRestore();
  });

  it('si setItem falla al guardar cache, updateConfig no revienta en modo test', async () => {
    vi.stubEnv('MODE', 'test');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('write failed');
    });

    const { result } = renderHook(() => useSystemConfig());

    await expect(result.current.updateConfig(DEFAULT_SYSTEM_CONFIG)).resolves.toBeUndefined();
    setItemSpy.mockRestore();
  });

  it('usa defaults cuando currencies remotas son inválidas', async () => {
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          { key: 'accountTypes', value: [{ id: 'real', label: 'Real', value: 'real' }], updated_at: '2026-06-24T10:00:00.000Z' },
          { key: 'platforms', value: [{ id: 'mt5', label: 'MT5', value: 'mt5' }], updated_at: '2026-06-24T10:00:00.000Z' },
          { key: 'currencies', value: [], updated_at: '2026-06-24T10:00:00.000Z' },
        ],
        error: null,
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { result } = renderHook(() => useSystemConfig());

    await waitFor(() => {
      expect(result.current.config.platforms[0].value).toBe('mt5');
    });

    expect(result.current.config.currencies).toEqual(DEFAULT_SYSTEM_CONFIG.currencies);
  });

  it('si select remoto lanza excepción, mantiene defaults/local sin romper', async () => {
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockRejectedValue(new Error('select exploded')),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { result } = renderHook(() => useSystemConfig());

    await waitFor(() => {
      expect(result.current.config.accountTypes.length).toBeGreaterThan(0);
    });
  });
});
