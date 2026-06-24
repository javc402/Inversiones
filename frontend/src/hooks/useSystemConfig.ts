import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@lib/supabase';

export interface ConfigItem {
  id: string;
  label: string;
  value: string;
  description?: string;
}

export interface SystemConfig {
  accountTypes: ConfigItem[];
  platforms: ConfigItem[];
  currencies: ConfigItem[];
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  accountTypes: [
    { id: 'real', label: 'Real', value: 'real', description: 'Cuenta de dinero real en broker' },
    { id: 'demo', label: 'Demo', value: 'demo', description: 'Cuenta de práctica sin riesgo' },
    { id: 'funded', label: 'Fondeo', value: 'funded', description: 'Cuenta financiada por firma externa' },
  ],
  platforms: [
    { id: 'mt4', label: 'MT4', value: 'mt4' },
    { id: 'mt5', label: 'MT5', value: 'mt5' },
    { id: 'ctrader', label: 'cTrader', value: 'ctrader' },
    { id: 'other', label: 'Otro', value: 'other' },
  ],
  currencies: [
    { id: 'USD', label: 'USD – Dólar estadounidense', value: 'USD' },
    { id: 'EUR', label: 'EUR – Euro', value: 'EUR' },
    { id: 'GBP', label: 'GBP – Libra esterlina', value: 'GBP' },
  ],
};

const STORAGE_KEY = 'inversiones_system_config_cache';
const STORAGE_TS_KEY = 'inversiones_system_config_cache_ts';

function loadLocalCache(): SystemConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<SystemConfig>;
      if (parsed.accountTypes && parsed.platforms && parsed.currencies) {
        return parsed as SystemConfig;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function saveLocalCache(config: SystemConfig, timestamp = Date.now()): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    localStorage.setItem(STORAGE_TS_KEY, String(timestamp));
  } catch {
    // ignore
  }
}

function parseRemoteConfig(
  rows: Array<{ key: string; value: unknown; updated_at?: string | null }>
): { config: SystemConfig; updatedAtMs: number } {
  const fromDb: Partial<SystemConfig> = {};
  let updatedAtMs = 0;

  for (const row of rows) {
    if (['accountTypes', 'platforms', 'currencies'].includes(row.key)) {
      fromDb[row.key as keyof SystemConfig] = row.value as ConfigItem[];
    }

    const rowTime = row.updated_at ? Date.parse(row.updated_at) : 0;
    if (!Number.isNaN(rowTime) && rowTime > updatedAtMs) {
      updatedAtMs = rowTime;
    }
  }

  return {
    config: {
      accountTypes:
        Array.isArray(fromDb.accountTypes) && fromDb.accountTypes.length > 0
          ? fromDb.accountTypes
          : DEFAULT_SYSTEM_CONFIG.accountTypes,
      platforms:
        Array.isArray(fromDb.platforms) && fromDb.platforms.length > 0
          ? fromDb.platforms
          : DEFAULT_SYSTEM_CONFIG.platforms,
      currencies:
        Array.isArray(fromDb.currencies) && fromDb.currencies.length > 0
          ? fromDb.currencies
          : DEFAULT_SYSTEM_CONFIG.currencies,
    },
    updatedAtMs,
  };
}

export function useSystemConfig() {
  const [config, setConfigState] = useState<SystemConfig>(
    loadLocalCache() ?? DEFAULT_SYSTEM_CONFIG
  );

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;

    async function fetchConfig() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabase as any;
        const { data, error } = await db.from('system_config').select('key, value, updated_at');
        if (error || !Array.isArray(data) || data.length === 0) return;

        const remote = parseRemoteConfig(
          data as Array<{ key: string; value: unknown; updated_at?: string | null }>
        );

        const localConfig = loadLocalCache();
        const localTsRaw = Number(localStorage.getItem(STORAGE_TS_KEY) ?? '0');
        const localUpdatedAtMs = Number.isFinite(localTsRaw) ? localTsRaw : 0;

        // If local cache is newer than what comes from remote, keep local to avoid data loss on refresh.
        if (localConfig && localUpdatedAtMs > remote.updatedAtMs) {
          setConfigState(localConfig);
          return;
        }

        setConfigState(remote.config);
        saveLocalCache(remote.config, remote.updatedAtMs || Date.now());
      } catch {
        // use local cache / defaults silently
      }
    }

    void fetchConfig();
  }, []);

  const updateConfig = useCallback((next: SystemConfig) => {
    setConfigState(next);

    saveLocalCache(next, Date.now());

    if (import.meta.env.MODE === 'test') return;

    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      let persisted = false;

      try {
        const rpcResult = await db.rpc('save_system_config', {
          config: {
            accountTypes: next.accountTypes,
            platforms: next.platforms,
            currencies: next.currencies,
          },
        });

        persisted = !rpcResult?.error;
      } catch {
        persisted = false;
      }

      if (!persisted) {
        try {
          const payload = [
            { key: 'accountTypes', value: next.accountTypes, updated_at: new Date().toISOString() },
            { key: 'platforms', value: next.platforms, updated_at: new Date().toISOString() },
            { key: 'currencies', value: next.currencies, updated_at: new Date().toISOString() },
          ];

          const fallback = await db
            .from('system_config')
            .upsert(payload, { onConflict: 'key' });

          persisted = !fallback?.error;
        } catch {
          persisted = false;
        }
      }

      if (!persisted) {
        console.error('No se pudo persistir system_config en Supabase. Se conserva cache local.');
      }
    })();
  }, []);

  return { config, updateConfig };
}
