import { supabase } from '@lib/supabase';

export type MarketEntryDirection = 'buy' | 'sell';
export type MarketEntryStatus = 'planned' | 'open' | 'closed' | 'cancelled' | 'no_entry';
export type MarketContextSource = 'free_text' | 'news';
export type MarketNewsImpact = 'high' | 'medium' | 'low';
export type CandleProtocol = 'ob' | 'fvg' | 'no';

export interface MarketEntry {
  id: string;
  groupId: string;
  userEmail: string;
  accountId: string;
  accountName: string;
  symbol: string;
  symbolDetail: string | null;
  marketContext: string;
  contextSource: MarketContextSource;
  newsArticleId: string | null;
  newsImpact: MarketNewsImpact | null;
  setup: string;
  session: string;
  candleProtocol: CandleProtocol | null;
  direction: MarketEntryDirection;
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  closePrice?: number | null;
  operationLink: string | null;
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
  symbolDetail?: string | null;
  marketContext: string;
  contextSource: MarketContextSource;
  newsArticleId?: string | null;
  newsImpact?: MarketNewsImpact | null;
  setup?: string;
  session?: string;
  candleProtocol?: CandleProtocol;
  direction?: MarketEntryDirection;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  closePrice?: number | null;
  operationLink?: string;
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
  marketContext?: string;
  accountId?: string;
  accountName?: string;
  direction?: MarketEntryDirection;
  riskAmount: number;
  investmentPercent: number;
  closePrice?: number | null;
  resultR: number | null;
  plannedAt?: string;
  operationLink?: string;
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
  symbol_detail?: string | null;
  market_context: string;
  context_source: MarketContextSource;
  news_article_id: string | null;
  news_impact?: MarketNewsImpact | null;
  setup: string;
  session: string;
  candle_protocol?: CandleProtocol | null;
  envelope_protocol?: CandleProtocol | null;
  direction: MarketEntryDirection | null;
  entry_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  close_price?: number | null;
  operation_link?: string | null;
  operation_url?: string | null;
  risk_amount: number | null;
  investment_percent: number | null;
  result_r: number | null;
  risk_reward?: number | null;
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
    symbolDetail: row.symbol_detail ?? null,
    marketContext: row.market_context,
    contextSource: row.context_source,
    newsArticleId: row.news_article_id,
    newsImpact: row.news_impact ?? null,
    setup: row.setup,
    session: row.session,
    candleProtocol: row.candle_protocol ?? row.envelope_protocol ?? null,
    direction: row.direction ?? 'buy',
    entryPrice: row.entry_price === null || row.entry_price === undefined ? null : Number(row.entry_price),
    stopLoss: row.stop_loss === null || row.stop_loss === undefined ? null : Number(row.stop_loss),
    takeProfit: row.take_profit === null || row.take_profit === undefined ? null : Number(row.take_profit),
    closePrice: row.close_price === null || row.close_price === undefined ? null : Number(row.close_price),
    operationLink: row.operation_link ?? row.operation_url ?? null,
    riskAmount: row.risk_amount === null ? 0 : Number(row.risk_amount),
    investmentPercent: row.investment_percent === null ? 0 : Number(row.investment_percent),
    resultR: row.result_r ?? row.risk_reward ?? null,
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

function validateOptionalUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return '';
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    throw new Error('El link de la operación no es válido.');
  }
}

function hasSingleDecimalPrecision(value: number): boolean {
  return Number.isInteger(value * 10);
}

function validateResultR(value: number | null | undefined): void {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    throw new Error('El Resultado R es obligatorio para entradas completadas.');
  }

  if (!hasSingleDecimalPrecision(value)) {
    throw new Error('El Resultado R debe tener un único decimal.');
  }
}

function validateCommonInput(common: MarketEntryCommonInput): void {
  if (!common.marketContext.trim()) throw new Error('El contexto/noticia es obligatorio.');
  if (common.contextSource === 'news' && !common.newsArticleId) {
    throw new Error('Debes seleccionar una noticia registrada.');
  }
  if (common.contextSource === 'news' && !common.newsImpact) {
    throw new Error('Debes indicar el impacto de la noticia.');
  }

  if (common.status === 'no_entry') {
    if (!common.noEntryReason?.trim()) {
      throw new Error('Debes indicar el motivo sin entrada.');
    }
    return;
  }

  if (!common.symbol?.trim()) throw new Error('El símbolo es obligatorio.');
  if (common.symbol.trim().toUpperCase() === 'OTRO' && !common.symbolDetail?.trim()) {
    throw new Error('Debes indicar el símbolo cuando seleccionas Otro.');
  }
  if (!common.setup?.trim()) throw new Error('El setup/estrategia es obligatorio.');
  if (!common.session?.trim()) throw new Error('La sesión es obligatoria.');
  if (!common.direction) throw new Error('La dirección es obligatoria.');
  validateOptionalUrl(common.operationLink);
  if (common.status === 'closed') {
    validateResultR(common.resultR);
  }
}

function validatePerAccount(perAccount: MarketEntryAccountInput[], _status: MarketEntryStatus): void {
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

function validateUpdateMarketEntryInput(next: UpdateMarketEntryInput): void {
  if (next.marketContext !== undefined && !next.marketContext.trim()) {
    throw new Error('El contexto/noticia es obligatorio.');
  }

  if (next.plannedAt) {
    const executionDate = new Date(next.plannedAt);
    if (Number.isNaN(executionDate.getTime())) {
      throw new TypeError('La fecha de ejecucion no es valida.');
    }
  }

  validateOptionalUrl(next.operationLink);
}

function buildMarketEntryUpdatePayload(
  previous: MarketEntryRow,
  next: UpdateMarketEntryInput,
  timestamp: string,
  trimmedNote: string,
  isNoEntryFlow: boolean
) {
  if (isNoEntryFlow) {
    const accountId = next.accountId ?? previous.account_id ?? null;
    const accountName = next.accountName?.trim() || previous.account_name || null;
    const hasAssociatedAccount = Boolean(accountId && accountName);

    return {
      status: next.status,
      market_context: next.marketContext?.trim() || previous.market_context,
      planned_at: next.plannedAt ?? previous.planned_at,
      account_id: accountId,
      account_name: accountName,
      direction: null,
      risk_amount: hasAssociatedAccount ? next.riskAmount : null,
      investment_percent: hasAssociatedAccount ? next.investmentPercent : null,
      result_r: null,
      note: trimmedNote,
      no_entry_reason: next.status === 'no_entry' ? (next.noEntryReason?.trim() ?? previous.no_entry_reason ?? '') : null,
      operation_link: next.operationLink?.trim() || null,
      updated_at: timestamp,
    };
  }

  return {
    status: next.status,
    market_context: next.marketContext?.trim() || previous.market_context,
    planned_at: next.plannedAt ?? previous.planned_at,
    account_id: next.accountId ?? previous.account_id,
    account_name: next.accountName?.trim() || previous.account_name,
    direction: next.direction ?? previous.direction,
    risk_amount: next.riskAmount,
    investment_percent: next.investmentPercent,
    result_r: next.resultR,
    operation_link: next.operationLink?.trim() || null,
    note: trimmedNote,
    no_entry_reason: null,
    updated_at: timestamp,
  };
}

function validateFinalUpdatePayload(
  payload: Record<string, unknown>,
  status: MarketEntryStatus
): void {
  if (status === 'no_entry') {
    if (payload.no_entry_reason === undefined || payload.no_entry_reason === null || String(payload.no_entry_reason).trim() === '') {
      throw new Error('Debes indicar el motivo sin entrada.');
    }

    if (payload.account_id) {
      if (!payload.account_name || !String(payload.account_name).trim()) {
        throw new Error('Debes asociar un nombre de cuenta válido.');
      }

      if (!Number.isFinite(Number(payload.risk_amount)) || Number(payload.risk_amount) <= 0) {
        throw new Error('El riesgo debe ser mayor que 0.');
      }

      if (!Number.isFinite(Number(payload.investment_percent)) || Number(payload.investment_percent) <= 0) {
        throw new Error('El % de inversión debe ser mayor que 0.');
      }
    }

    return;
  }

  if (!payload.account_id || !String(payload.account_id).trim()) {
    throw new Error('Debes asociar una cuenta válida.');
  }

  if (!payload.account_name || !String(payload.account_name).trim()) {
    throw new Error('Debes asociar un nombre de cuenta válido.');
  }

  if (payload.direction !== 'buy' && payload.direction !== 'sell') {
    throw new Error('Debes indicar una dirección válida.');
  }

  if (!Number.isFinite(Number(payload.risk_amount)) || Number(payload.risk_amount) <= 0) {
    throw new Error('El riesgo debe ser mayor que 0.');
  }

  if (!Number.isFinite(Number(payload.investment_percent)) || Number(payload.investment_percent) <= 0) {
    throw new Error('El % de inversión debe ser mayor que 0.');
  }

  if (status === 'closed') {
    validateResultR(Number(payload.result_r));
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

  if (error) throw new Error(error.message ?? 'No se pudieron listar las entradas.');

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

  if (error) throw new Error(error.message ?? 'No se pudieron listar los contextos.');

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

  const payload = normalizedPerAccount.map((item) => ({
        user_id: userId,
        group_id: groupId,
        account_id: item.accountId,
        account_name: item.accountName,
        symbol: (input.common.symbol ?? '').trim().toUpperCase(),
        symbol_detail: input.common.symbolDetail?.trim().toUpperCase() || null,
        market_context: input.common.marketContext.trim(),
        context_source: input.common.contextSource,
        news_article_id: input.common.contextSource === 'news' ? (input.common.newsArticleId ?? null) : null,
        news_impact: input.common.contextSource === 'news' ? (input.common.newsImpact ?? null) : null,
        setup: (input.common.setup ?? '').trim(),
        session: (input.common.session ?? '').trim(),
        candle_protocol: input.common.candleProtocol ?? 'no',
        direction: input.common.status === 'no_entry' ? null : input.common.direction,
        operation_link: validateOptionalUrl(input.common.operationLink) || null,
        risk_amount: item.riskAmount,
        investment_percent: item.investmentPercent,
        result_r: input.common.status === 'closed' ? (input.common.resultR ?? null) : null,
        no_entry_reason: input.common.status === 'no_entry' ? (input.common.noEntryReason as string).trim() : null,
        note: input.common.note.trim(),
        status: input.common.status,
        planned_at: input.common.plannedAt,
        created_at: timestamp,
        updated_at: timestamp,
      }));

  const { data, error } = await supabase.from('market_entries').insert(payload as never).select('*');

  if (error) throw new Error(error.message ?? 'No se pudo crear la entrada en la base de datos.');

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
    throw new Error(previousError?.message ?? 'No se encontró la entrada solicitada.');
  }

  const previous = previousRow as MarketEntryRow;
  const isNoEntryFlow = next.status === 'no_entry';
  validateUpdateMarketEntryInput(next);

  const timestamp = nowIso();
  const trimmedNote = next.note.trim();
  const baseUpdate = buildMarketEntryUpdatePayload(previous, next, timestamp, trimmedNote, isNoEntryFlow);
  validateFinalUpdatePayload(baseUpdate, next.status);

  const { data: updatedRows, error: updateError } = await supabase
    .from('market_entries')
    .update(baseUpdate)
    .eq('id', entryId)
    .eq('user_id', userId)
    .select('*');

  if (updateError || !updatedRows || updatedRows.length === 0) {
    throw new Error(updateError?.message ?? 'No se pudo actualizar la entrada solicitada.');
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
      throw new Error(groupError.message ?? 'No se pudieron aplicar cambios al grupo.');
    }

    affectedEntries = groupRows?.length ?? 0;
  }

  return {
    updatedEntry: {
      ...updated,
      status: next.status,
      plannedAt: next.plannedAt ?? updated.plannedAt,
      riskAmount: isNoEntryFlow ? updated.riskAmount : next.riskAmount,
      investmentPercent: isNoEntryFlow ? updated.investmentPercent : next.investmentPercent,
      resultR: isNoEntryFlow ? updated.resultR : next.resultR,
        operationLink: next.operationLink?.trim() || null,
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

  if (error) throw new Error(error.message ?? 'No se pudo eliminar la entrada.');

  if (!data || data.length === 0) {
    throw new Error('No se encontró la entrada solicitada.');
  }
}
