import { supabase } from '@lib/supabase';

export type MarketEntryDirection = 'buy' | 'sell';
export type MarketEntryStatus = 'planned' | 'open' | 'closed' | 'cancelled' | 'no_entry';
export type MarketContextSource = 'free_text' | 'news';

export interface MarketEntry {
  id: string;
  groupId: string;
  userEmail: string;
  accountId: string;
  accountName: string;
  symbol: string;
  marketContext: string;
  contextSource: MarketContextSource;
  newsArticleId: string | null;
  setup: string;
  session: string;
  direction: MarketEntryDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  investmentPercent: number;
  resultR: number | null;
  noEntryReason: string | null;
  note: string;
  status: MarketEntryStatus;
  plannedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketEntryCommonInput {
  symbol?: string;
  marketContext: string;
  contextSource: MarketContextSource;
  newsArticleId?: string | null;
  setup?: string;
  session?: string;
  direction?: MarketEntryDirection;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  resultR?: number | null;
  noEntryReason?: string;
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

interface UpdateMarketEntryInput {
  status: MarketEntryStatus;
  riskAmount: number;
  investmentPercent: number;
  resultR: number | null;
  note: string;
  noEntryReason?: string;
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
  account_id: string | null;
  account_name: string | null;
  symbol: string;
  market_context: string;
  context_source: MarketContextSource;
  news_article_id: string | null;
  setup: string;
  session: string;
  direction: MarketEntryDirection | null;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  risk_amount: number | null;
  investment_percent: number | null;
  result_r: number | null;
  no_entry_reason: string | null;
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
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `group-${cryptoApi.randomUUID()}`;
  }

  return `group-${Date.now()}`;
}

function mapRowToEntry(row: MarketEntryRow): MarketEntry {
  return {
    id: row.id,
    groupId: row.group_id,
    userEmail: '',
    accountId: row.account_id ?? '',
    accountName: row.account_name ?? '',
    symbol: row.symbol,
    marketContext: row.market_context,
    contextSource: row.context_source,
    newsArticleId: row.news_article_id,
    setup: row.setup,
    session: row.session,
    direction: row.direction ?? 'buy',
    entryPrice: row.entry_price === null ? 0 : Number(row.entry_price),
    stopLoss: row.stop_loss === null ? 0 : Number(row.stop_loss),
    takeProfit: row.take_profit === null ? 0 : Number(row.take_profit),
    riskAmount: row.risk_amount === null ? 0 : Number(row.risk_amount),
    investmentPercent: row.investment_percent === null ? 0 : Number(row.investment_percent),
    resultR: row.result_r,
    noEntryReason: row.no_entry_reason,
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
  if (!common.marketContext.trim()) throw new Error('El contexto/noticia es obligatorio.');
  if (common.contextSource === 'news' && !common.newsArticleId) {
    throw new Error('Debes seleccionar una noticia registrada.');
  }

  if (common.status === 'no_entry') {
    if (!common.noEntryReason?.trim()) {
      throw new Error('Debes indicar el motivo sin entrada.');
    }
    return;
  }

  if (!common.symbol?.trim()) throw new Error('El símbolo es obligatorio.');
  if (!common.setup?.trim()) throw new Error('El setup/estrategia es obligatorio.');
  if (!common.session?.trim()) throw new Error('La sesión es obligatoria.');
  if (!common.direction) throw new Error('La dirección es obligatoria.');
  if (!Number.isFinite(common.entryPrice) || (common.entryPrice ?? 0) <= 0) throw new Error('Precio de entrada inválido.');
  if (!Number.isFinite(common.stopLoss) || (common.stopLoss ?? 0) <= 0) throw new Error('Stop loss inválido.');
  if (!Number.isFinite(common.takeProfit) || (common.takeProfit ?? 0) <= 0) throw new Error('Take profit inválido.');
  if (common.status === 'closed' && (common.resultR === null || common.resultR === undefined || !Number.isFinite(common.resultR))) {
    throw new Error('El Resultado R es obligatorio para entradas completadas.');
  }
}

function validatePerAccount(perAccount: MarketEntryAccountInput[], status: MarketEntryStatus): void {
  if (status === 'no_entry') return;

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

function validateUpdateMarketEntryInput(
  next: UpdateMarketEntryInput,
  isNoEntryFlow: boolean
): void {
  if (isNoEntryFlow) {
    if (next.status === 'no_entry' && !next.noEntryReason?.trim()) {
      throw new Error('Debes indicar el motivo sin entrada.');
    }
    return;
  }

  if (!Number.isFinite(next.riskAmount) || next.riskAmount <= 0) {
    throw new Error('El riesgo debe ser mayor que 0.');
  }

  if (!Number.isFinite(next.investmentPercent) || next.investmentPercent <= 0) {
    throw new Error('El % de inversión debe ser mayor que 0.');
  }
}

function buildMarketEntryUpdatePayload(
  previous: MarketEntryRow,
  next: UpdateMarketEntryInput,
  timestamp: string,
  trimmedNote: string,
  isNoEntryFlow: boolean
) {
  if (isNoEntryFlow) {
    return {
      status: next.status,
      note: trimmedNote,
      no_entry_reason: next.status === 'no_entry' ? (next.noEntryReason?.trim() ?? previous.no_entry_reason ?? '') : null,
      updated_at: timestamp,
    };
  }

  return {
    status: next.status,
    risk_amount: next.riskAmount,
    investment_percent: next.investmentPercent,
    result_r: next.resultR,
    note: trimmedNote,
    no_entry_reason: null,
    updated_at: timestamp,
  };
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

export async function listMostUsedMarketContexts(_userEmail: string, limit = 8): Promise<string[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('market_entries')
    .select('market_context, context_source')
    .eq('user_id', userId)
    .eq('context_source', 'free_text');

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const context = typeof row.market_context === 'string' ? row.market_context.trim() : '';
    if (!context) continue;
    counts.set(context, (counts.get(context) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(1, limit))
    .map(([context]) => context);
}

export async function createMarketEntriesForAccounts(_userEmail: string, input: CreateMarketEntriesInput): Promise<MarketEntry[]> {
  validateCommonInput(input.common);

  const normalizedPerAccount = normalizePerAccount(input.perAccount);
  validatePerAccount(normalizedPerAccount, input.common.status);

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error('No hay un usuario autenticado para crear entradas.');
  }

  const timestamp = nowIso();
  const groupId = createGroupId();

  const payload = input.common.status === 'no_entry'
    ? [{
        user_id: userId,
        group_id: groupId,
        account_id: null,
        account_name: null,
        symbol: (input.common.symbol ?? '').trim().toUpperCase(),
        market_context: input.common.marketContext.trim(),
        context_source: input.common.contextSource,
        news_article_id: input.common.contextSource === 'news' ? (input.common.newsArticleId ?? null) : null,
        setup: (input.common.setup ?? '').trim(),
        session: (input.common.session ?? '').trim(),
        direction: null,
        entry_price: null,
        stop_loss: null,
        take_profit: null,
        risk_amount: null,
        investment_percent: null,
        result_r: null,
        no_entry_reason: (input.common.noEntryReason as string).trim(),
        note: input.common.note.trim(),
        status: input.common.status,
        planned_at: input.common.plannedAt,
        created_at: timestamp,
        updated_at: timestamp,
      }]
    : normalizedPerAccount.map((item) => ({
        user_id: userId,
        group_id: groupId,
        account_id: item.accountId,
        account_name: item.accountName,
        symbol: (input.common.symbol ?? '').trim().toUpperCase(),
        market_context: input.common.marketContext.trim(),
        context_source: input.common.contextSource,
        news_article_id: input.common.contextSource === 'news' ? (input.common.newsArticleId ?? null) : null,
        setup: (input.common.setup as string).trim(),
        session: (input.common.session as string).trim(),
        direction: input.common.direction,
        entry_price: input.common.entryPrice,
        stop_loss: input.common.stopLoss,
        take_profit: input.common.takeProfit,
        risk_amount: item.riskAmount,
        investment_percent: item.investmentPercent,
        result_r: input.common.resultR ?? null,
        no_entry_reason: null,
        note: input.common.note.trim(),
        status: input.common.status,
        planned_at: input.common.plannedAt,
        created_at: timestamp,
        updated_at: timestamp,
      }));

  const { data, error } = await supabase.from('market_entries').insert(payload as never).select('*');

  if (error) throw error;

  return (data ?? []).map((row) => mapRowToEntry(row as MarketEntryRow));
}

export async function updateMarketEntryById(
  _userEmail: string,
  entryId: string,
  next: UpdateMarketEntryInput,
  options?: UpdateMarketEntryOptions
): Promise<UpdateMarketEntryResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error('No hay un usuario autenticado para actualizar entradas.');
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
  const isNoEntryFlow = previous.status === 'no_entry' || next.status === 'no_entry';
  validateUpdateMarketEntryInput(next, isNoEntryFlow);

  const timestamp = nowIso();
  const trimmedNote = next.note.trim();
  const baseUpdate = buildMarketEntryUpdatePayload(previous, next, timestamp, trimmedNote, isNoEntryFlow);

  const { data: updatedRows, error: updateError } = await supabase
    .from('market_entries')
    .update(baseUpdate)
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
      riskAmount: isNoEntryFlow ? updated.riskAmount : next.riskAmount,
      investmentPercent: isNoEntryFlow ? updated.investmentPercent : next.investmentPercent,
      resultR: isNoEntryFlow ? updated.resultR : next.resultR,
      note: trimmedNote,
      noEntryReason: next.status === 'no_entry' ? (next.noEntryReason as string).trim() : null,
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
