import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('supabase lib', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('usa placeholders cuando faltan variables de entorno', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const module = await import('@lib/supabase');

    expect(module.supabase).toBeDefined();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('no loguea error cuando variables existen', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'demo-key');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const module = await import('@lib/supabase');

    expect(module.supabase).toBeDefined();
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('loguea error cuando falta solo URL', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'demo-key');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const module = await import('@lib/supabase');

    expect(module.supabase).toBeDefined();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('loguea error cuando falta solo key', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const module = await import('@lib/supabase');

    expect(module.supabase).toBeDefined();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('usa fallback de nullish coalescing cuando env es undefined', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined as unknown as string);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined as unknown as string);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const module = await import('@lib/supabase');

    expect(module.supabase).toBeDefined();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
