import { supabase } from '@lib/supabase';
import { detectChanges, logAuditActivity, logChangesWithStandardFormat } from './audit';

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

  void logAuditActivity('accounts.list', {
    module: 'accounts',
    targetType: 'account',
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

  void logAuditActivity('accounts.create', {
    module: 'accounts',
    targetType: 'account',
    account_type: input.account_type,
    broker_name: input.broker_name,
  });
}

export async function updateTradingAccount(accountId: string, input: UpsertTradingAccountInput): Promise<void> {
  // Cargar valores anteriores para auditoría before/after - TODOS los campos
  const { data: beforeData } = await supabase
    .from('trading_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (!beforeData) throw new Error('Account not found');

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

  // Detectar todos los cambios realizados
  const fieldsToCheck = [
    'name', 'alias', 'broker_name', 'account_type', 'platform', 'base_currency',
    'leverage', 'initial_balance', 'initial_equity', 'opened_at', 'status',
    'risk_per_trade_pct', 'max_daily_risk_pct', 'max_drawdown_pct', 'funding_firm',
    'challenge_phase', 'profit_target_pct', 'daily_loss_limit_pct', 'max_loss_limit_pct',
    'payout_cycle', 'notes'
  ];

  const changes = detectChanges(beforeData, input, fieldsToCheck);

  // Log con todos los cambios capturados
  void logChangesWithStandardFormat(
    'accounts.update',
    'accounts',
    'account',
    accountId,
    changes
  );
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

  const changes = [
    { field: 'status', before: currentStatus, after: nextStatus }
  ];

  void logChangesWithStandardFormat(
    'accounts.toggle_status',
    'accounts',
    'account',
    accountId,
    changes
  );

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

  const changes = [
    { field: 'is_favorite', before: currentIsFavorite, after: nextIsFavorite }
  ];

  void logChangesWithStandardFormat(
    'accounts.toggle_favorite',
    'accounts',
    'account',
    accountId,
    changes
  );

  return nextIsFavorite;
}
