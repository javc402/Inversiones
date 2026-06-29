import { supabase } from '@lib/supabase';

export type MarketEntryDirection = 'buy' | 'sell';
export type MarketEntryStatus = 'planned' | 'open' | 'closed' | 'cancelled';

export interface MarketEntry {
  id: string;
  groupId: string;
  userEmail: string;
  accountId: string;
  accountName: string;
  symbol: string;
  marketContext: string;
  setup: string;
  session: string;
  direction: MarketEntryDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  investmentPercent: number;
  resultR: number | null;
  note: string;
  status: MarketEntryStatus;
  plannedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketEntryCommonInput {
  symbol: string;
  marketContext: string;
  setup: string;
  session: string;
  direction: MarketEntryDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  note: string;
  plannedAt: string;
  status: MarketEntryStatus;
}

export interface MarketEntryAccountInput {
  accountId: string;
  accountName: string;
  riskAmount: number;
  investmentPercent: number;
}

export interface CreateMarketEntriesInput {
  common: MarketEntryCommonInput;
  perAccount: MarketEntryAccountInput[];
}

interface UpdateMarketEntryOptions {
  applyCommonToGroup?: boolean;
}

interface UpdateMarketEntryResult {
  updatedEntry: MarketEntry;
  affectedEntries: number;
  groupApplied: boolean;
}

interface MarketEntryRow {
  id: string;
  group_id: string;
  account_id: string;
  account_name: string;
  symbol: string;
  market_context: string;
  setup: string;
  session: string;
  direction: MarketEntryDirection;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  risk_amount: number;
  investment_percent: number;
  result_r: number | null;
  note: string;
  status: MarketEntryStatus;
  planned_at: string;
  created_at: string;
  updated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createGroupId(): string {
  const random = Math.random().toString(16).slice(2, 10);
  return `group-${Date.now()}-${random}`;
}

function mapRowToEntry(row: MarketEntryRow): MarketEntry {
  return {
    id: row.id,
    groupId: row.group_id,
    userEmail: '',
    accountId: row.account_id,
    accountName: row.account_name,
    symbol: row.symbol,
    marketContext: row.market_context,
    setup: row.setup,
    session: row.session,
    direction: row.direction,
    entryPrice: Number(row.entry_price),
    stopLoss: Number(row.stop_loss),
    takeProfit: Number(row.take_profit),
    riskAmount: Number(row.risk_amount),
    investmentPercent: Number(row.investment_percent),
    resultR: row.result_r,
    note: row.note,
    status: row.status,
    plannedAt: row.planned_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function normalizePerAccount(perAccount: MarketEntryAccountInput[]): MarketEntryAccountInput[] {
  return perAccount.map((item) => ({
    accountId: item.accountId,
    accountName: item.accountName.trim(),
    riskAmount: item.riskAmount,
    investmentPercent: item.investmentPercent,
  }));
}

function validateCommonInput(common: MarketEntryCommonInput): void {
  if (!common.symbol.trim()) throw new Error('El símbolo es obligatorio.');
  if (!common.marketContext.trim()) throw new Error('El contexto/noticia es obligatorio.');
  if (!common.setup.trim()) throw new Error('El setup es obligatorio.');
  if (!common.session.trim()) throw new Error('La sesión es obligatoria.');
  if (!Number.isFinite(common.entryPrice) || common.entryPrice <= 0) throw new Error('Precio de entrada inválido.');
  if (!Number.isFinite(common.stopLoss) || common.stopLoss <= 0) throw new Error('Stop loss inválido.');
  if (!Number.isFinite(common.takeProfit) || common.takeProfit <= 0) throw new Error('Take profit inválido.');
}

function validatePerAccount(perAccount: MarketEntryAccountInput[]): void {
  if (perAccount.length === 0) {
    throw new Error('Debes asociar al menos una cuenta.');
  }

  const accountIds = new Set<string>();
  for (const item of perAccount) {
    if (!item.accountId) {
      throw new Error('Cada fila debe tener cuenta asociada.');
    }

    if (accountIds.has(item.accountId)) {
      throw new Error('No puedes repetir la misma cuenta en una misma entrada.');
    }
    accountIds.add(item.accountId);

    if (!Number.isFinite(item.riskAmount) || item.riskAmount <= 0) {
      throw new Error('El riesgo por cuenta debe ser mayor que 0.');
    }

    if (!Number.isFinite(item.investmentPercent) || item.investmentPercent <= 0) {
      throw new Error('El % de inversión por cuenta debe ser mayor que 0.');
    }
  }
}

export async function listMarketEntriesByUser(_userEmail: string): Promise<MarketEntry[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('market_entries')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => mapRowToEntry(row as MarketEntryRow));
}

export async function createMarketEntriesForAccounts(_userEmail: string, input: CreateMarketEntriesInput): Promise<MarketEntry[]> {
  validateCommonInput(input.common);

  const normalizedPerAccount = normalizePerAccount(input.perAccount);
  validatePerAccount(normalizedPerAccount);

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error('No hay un usuario autenticado para crear entradas.');
  }

  const timestamp = nowIso();
  const groupId = createGroupId();

  const payload = normalizedPerAccount.map((item) => ({
    user_id: userId,
    group_id: groupId,
    account_id: item.accountId,
    account_name: item.accountName,
    symbol: input.common.symbol.trim().toUpperCase(),
    market_context: input.common.marketContext.trim(),
    setup: input.common.setup.trim(),
    session: input.common.session.trim(),
    direction: input.common.direction,
    entry_price: input.common.entryPrice,
    stop_loss: input.common.stopLoss,
    take_profit: input.common.takeProfit,
    risk_amount: item.riskAmount,
    investment_percent: item.investmentPercent,
    result_r: null,
    note: input.common.note.trim(),
    status: input.common.status,
    planned_at: input.common.plannedAt,
    created_at: timestamp,
    updated_at: timestamp,
  }));

  const { data, error } = await supabase.from('market_entries').insert(payload).select('*');

  if (error) throw error;

  return (data ?? []).map((row) => mapRowToEntry(row as MarketEntryRow));
}

export async function updateMarketEntryById(
  _userEmail: string,
  entryId: string,
  next: {
    status: MarketEntryStatus;
    riskAmount: number;
    investmentPercent: number;
    resultR: number | null;
    note: string;
  },
  options?: UpdateMarketEntryOptions
): Promise<UpdateMarketEntryResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error('No hay un usuario autenticado para actualizar entradas.');
  }

  if (!Number.isFinite(next.riskAmount) || next.riskAmount <= 0) {
    throw new Error('El riesgo debe ser mayor que 0.');
  }

  if (!Number.isFinite(next.investmentPercent) || next.investmentPercent <= 0) {
    throw new Error('El % de inversión debe ser mayor que 0.');
  }

  const { data: previousRow, error: previousError } = await supabase
    .from('market_entries')
    .select('*')
    .eq('id', entryId)
    .eq('user_id', userId)
    .single();

  if (previousError || !previousRow) {
    throw new Error('No se encontró la entrada solicitada.');
  }

  const previous = previousRow as MarketEntryRow;
  const timestamp = nowIso();
  const trimmedNote = next.note.trim();

  const { data: updatedRows, error: updateError } = await supabase
    .from('market_entries')
    .update({
      status: next.status,
      risk_amount: next.riskAmount,
      investment_percent: next.investmentPercent,
      result_r: next.resultR,
      note: trimmedNote,
      updated_at: timestamp,
    })
    .eq('id', entryId)
    .eq('user_id', userId)
    .select('*');

  if (updateError || !updatedRows || updatedRows.length === 0) {
    throw new Error('No se pudo actualizar la entrada solicitada.');
  }

  const updated = mapRowToEntry(updatedRows[0] as MarketEntryRow);
  const shouldApplyCommonToGroup = Boolean(options?.applyCommonToGroup);

  let affectedEntries = 1;

  if (shouldApplyCommonToGroup) {
    const { data: groupRows, error: groupError } = await supabase
      .from('market_entries')
      .update({
        status: next.status,
        note: trimmedNote,
        updated_at: timestamp,
      })
      .eq('group_id', previous.group_id)
      .eq('user_id', userId)
      .select('id');

    if (groupError) {
      throw new Error('No se pudieron aplicar cambios al grupo.');
    }

    affectedEntries = groupRows?.length ?? 0;
  }

  return {
    updatedEntry: {
      ...updated,
      status: next.status,
      riskAmount: next.riskAmount,
      investmentPercent: next.investmentPercent,
      resultR: next.resultR,
      note: trimmedNote,
    },
    affectedEntries,
    groupApplied: shouldApplyCommonToGroup,
  };
}

export async function deleteMarketEntryById(_userEmail: string, entryId: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error('No hay un usuario autenticado para eliminar entradas.');
  }

  const { data, error } = await supabase
    .from('market_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId)
    .select('id');

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error('No se encontró la entrada solicitada.');
  }
}
