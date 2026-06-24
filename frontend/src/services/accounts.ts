import { supabase } from '@lib/supabase';

export type TradingAccountType = 'real' | 'demo' | 'funded';
export type TradingAccountStatus = 'active' | 'inactive';
export type TradingPlatform = 'mt4' | 'mt5' | 'ctrader' | 'other';

export interface TradingAccount {
  id: string;
  user_id: string;
  name: string;
  alias: string | null;
  broker_name: string;
  account_type: TradingAccountType;
  platform: TradingPlatform;
  base_currency: string;
  leverage: string | null;
  initial_balance: number;
  initial_equity: number | null;
  opened_at: string;
  status: TradingAccountStatus;
  risk_per_trade_pct: number | null;
  max_daily_risk_pct: number | null;
  max_drawdown_pct: number | null;
  funding_firm: string | null;
  challenge_phase: string | null;
  profit_target_pct: number | null;
  daily_loss_limit_pct: number | null;
  max_loss_limit_pct: number | null;
  payout_cycle: string | null;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpsertTradingAccountInput {
  name: string;
  alias?: string;
  broker_name: string;
  account_type: TradingAccountType;
  platform: TradingPlatform;
  base_currency: string;
  leverage?: string;
  initial_balance: number;
  initial_equity?: number;
  opened_at: string;
  status: TradingAccountStatus;
  risk_per_trade_pct?: number;
  max_daily_risk_pct?: number;
  max_drawdown_pct?: number;
  funding_firm?: string;
  challenge_phase?: string;
  profit_target_pct?: number;
  daily_loss_limit_pct?: number;
  max_loss_limit_pct?: number;
  payout_cycle?: string;
  notes?: string;
}

type AccountActivityAction =
  | 'accounts.list'
  | 'accounts.create'
  | 'accounts.update'
  | 'accounts.toggle_status'
  | 'accounts.toggle_favorite';

async function logAccountActivity(
  action: AccountActivityAction,
  targetAccountId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (import.meta.env.MODE === 'test') return;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const logMetadata: Record<string, unknown> = {
      source: 'frontend',
      module: 'accounts',
    };

    if (targetAccountId) {
      logMetadata.targetAccountId = targetAccountId;
    }

    if (metadata) {
      Object.assign(logMetadata, metadata);
    }

    // Evita persistir llaves undefined en jsonb y mantiene metadata legible.
    for (const [key, value] of Object.entries(logMetadata)) {
      if (value === undefined) {
        delete logMetadata[key];
      }
    }

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action,
      target_user_id: user.id,
      metadata: logMetadata,
    });
  } catch (error) {
    console.error('Error writing account activity log:', error);
  }
}

export async function listTradingAccounts(): Promise<TradingAccount[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('trading_accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  void logAccountActivity('accounts.list', undefined, {
    resultCount: data?.length ?? 0,
  });

  return (data ?? []) as TradingAccount[];
}

export async function createTradingAccount(input: UpsertTradingAccountInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No hay un usuario autenticado para crear la cuenta.');
  }

  const payload = {
    ...input,
    user_id: user.id,
    alias: input.alias ?? null,
    leverage: input.leverage ?? null,
    initial_equity: input.initial_equity ?? null,
    risk_per_trade_pct: input.risk_per_trade_pct ?? null,
    max_daily_risk_pct: input.max_daily_risk_pct ?? null,
    max_drawdown_pct: input.max_drawdown_pct ?? null,
    funding_firm: input.funding_firm ?? null,
    challenge_phase: input.challenge_phase ?? null,
    profit_target_pct: input.profit_target_pct ?? null,
    daily_loss_limit_pct: input.daily_loss_limit_pct ?? null,
    max_loss_limit_pct: input.max_loss_limit_pct ?? null,
    payout_cycle: input.payout_cycle ?? null,
    notes: input.notes ?? null,
  };

  const { error } = await supabase.from('trading_accounts').insert(payload);

  if (error) throw error;

  void logAccountActivity('accounts.create', undefined, {
    account_type: input.account_type,
    broker_name: input.broker_name,
  });
}

export async function updateTradingAccount(accountId: string, input: UpsertTradingAccountInput): Promise<void> {
  // Cargar valores anteriores para auditoría before/after
  const { data: beforeData } = await supabase
    .from('trading_accounts')
    .select('account_type')
    .eq('id', accountId)
    .single();

  const payload = {
    ...input,
    alias: input.alias ?? null,
    leverage: input.leverage ?? null,
    initial_equity: input.initial_equity ?? null,
    risk_per_trade_pct: input.risk_per_trade_pct ?? null,
    max_daily_risk_pct: input.max_daily_risk_pct ?? null,
    max_drawdown_pct: input.max_drawdown_pct ?? null,
    funding_firm: input.funding_firm ?? null,
    challenge_phase: input.challenge_phase ?? null,
    profit_target_pct: input.profit_target_pct ?? null,
    daily_loss_limit_pct: input.daily_loss_limit_pct ?? null,
    max_loss_limit_pct: input.max_loss_limit_pct ?? null,
    payout_cycle: input.payout_cycle ?? null,
    notes: input.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('trading_accounts')
    .update(payload)
    .eq('id', accountId);

  if (error) throw error;

  void logAccountActivity('accounts.update', accountId, {
    fieldChanged: 'account_type',
    before: beforeData?.account_type ?? 'unknown',
    after: input.account_type,
  });
}

export async function toggleTradingAccountStatus(
  accountId: string,
  currentStatus: TradingAccountStatus
): Promise<TradingAccountStatus> {
  const nextStatus: TradingAccountStatus = currentStatus === 'active' ? 'inactive' : 'active';

  const { error } = await supabase
    .from('trading_accounts')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId);

  if (error) throw error;

  void logAccountActivity('accounts.toggle_status', accountId, {
    fieldChanged: 'status',
    before: currentStatus,
    after: nextStatus,
  });

  return nextStatus;
}

export async function toggleTradingAccountFavorite(accountId: string, currentIsFavorite: boolean): Promise<boolean> {
  const nextIsFavorite = !currentIsFavorite;

  const { error } = await supabase
    .from('trading_accounts')
    .update({
      is_favorite: nextIsFavorite,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId);

  if (error) throw error;

  void logAccountActivity('accounts.toggle_favorite', accountId, {
    fieldChanged: 'is_favorite',
    before: currentIsFavorite,
    after: nextIsFavorite,
  });

  return nextIsFavorite;
}
