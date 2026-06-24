import { TradingAccount } from '@services/accounts';

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

const MARKET_ENTRIES_STORAGE_KEY = 'inversiones_market_entries';

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function loadAllEntries(): MarketEntry[] {
  try {
    const stored = localStorage.getItem(MARKET_ENTRIES_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as MarketEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAllEntries(entries: MarketEntry[]): void {
  localStorage.setItem(MARKET_ENTRIES_STORAGE_KEY, JSON.stringify(entries));
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

export function listMarketEntriesByUser(userEmail: string): MarketEntry[] {
  return loadAllEntries()
    .filter((entry) => entry.userEmail === userEmail)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createMarketEntriesForAccounts(userEmail: string, input: CreateMarketEntriesInput): MarketEntry[] {
  validateCommonInput(input.common);

  const normalizedPerAccount = normalizePerAccount(input.perAccount);
  validatePerAccount(normalizedPerAccount);

  const current = loadAllEntries();
  const timestamp = nowIso();
  const groupId = createId('group');

  const created = normalizedPerAccount.map((item) => {
    const entry: MarketEntry = {
      id: createId('entry'),
      groupId,
      userEmail,
      accountId: item.accountId,
      accountName: item.accountName,
      symbol: input.common.symbol.trim().toUpperCase(),
      marketContext: input.common.marketContext.trim(),
      setup: input.common.setup.trim(),
      session: input.common.session.trim(),
      direction: input.common.direction,
      entryPrice: input.common.entryPrice,
      stopLoss: input.common.stopLoss,
      takeProfit: input.common.takeProfit,
      riskAmount: item.riskAmount,
      investmentPercent: item.investmentPercent,
      resultR: null,
      note: input.common.note.trim(),
      status: input.common.status,
      plannedAt: input.common.plannedAt,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    return entry;
  });

  saveAllEntries([...created, ...current]);
  return created;
}

export function updateMarketEntryById(
  userEmail: string,
  entryId: string,
  next: {
    status: MarketEntryStatus;
    riskAmount: number;
    investmentPercent: number;
    resultR: number | null;
    note: string;
  },
  options?: UpdateMarketEntryOptions
): UpdateMarketEntryResult {
  const entries = loadAllEntries();
  const index = entries.findIndex((entry) => entry.id === entryId && entry.userEmail === userEmail);

  if (index === -1) {
    throw new Error('No se encontró la entrada solicitada.');
  }

  if (!Number.isFinite(next.riskAmount) || next.riskAmount <= 0) {
    throw new Error('El riesgo debe ser mayor que 0.');
  }

  if (!Number.isFinite(next.investmentPercent) || next.investmentPercent <= 0) {
    throw new Error('El % de inversión debe ser mayor que 0.');
  }

  const previous = entries[index];
  const timestamp = nowIso();
  const trimmedNote = next.note.trim();

  const updated: MarketEntry = {
    ...previous,
    status: next.status,
    riskAmount: next.riskAmount,
    investmentPercent: next.investmentPercent,
    resultR: next.resultR,
    note: trimmedNote,
    updatedAt: timestamp,
  };

  const shouldApplyCommonToGroup = Boolean(options?.applyCommonToGroup);

  const nextEntries = entries.map((entry) => {
    if (entry.userEmail !== userEmail) return entry;

    if (entry.id === entryId) {
      return updated;
    }

    if (shouldApplyCommonToGroup && entry.groupId === previous.groupId) {
      return {
        ...entry,
        status: next.status,
        note: trimmedNote,
        updatedAt: timestamp,
      };
    }

    return entry;
  });

  saveAllEntries(nextEntries);

  const affectedEntries = shouldApplyCommonToGroup
    ? nextEntries.filter((entry) => entry.userEmail === userEmail && entry.groupId === previous.groupId).length
    : 1;

  return {
    updatedEntry: updated,
    affectedEntries,
    groupApplied: shouldApplyCommonToGroup,
  };
}

export function deleteMarketEntryById(userEmail: string, entryId: string): void {
  const entries = loadAllEntries();
  const next = entries.filter((entry) => !(entry.id === entryId && entry.userEmail === userEmail));

  if (next.length === entries.length) {
    throw new Error('No se encontró la entrada solicitada.');
  }

  saveAllEntries(next);
}

export function seedMarketEntries(userEmail: string, accounts: TradingAccount[]): void {
  const existing = listMarketEntriesByUser(userEmail);
  if (existing.length > 0) return;

  const usableAccounts = accounts.slice(0, 2);
  if (usableAccounts.length === 0) return;

  const input: CreateMarketEntriesInput = {
    common: {
      symbol: 'EURUSD',
      marketContext: 'CPI 6:30 / sesgo previo alcista',
      setup: 'Ruptura y retesteo en M5',
      session: 'NEW YORK',
      direction: 'buy',
      entryPrice: 1.0842,
      stopLoss: 1.0829,
      takeProfit: 1.087,
      note: 'Esperar confirmación de volumen en vela de entrada.',
      plannedAt: new Date().toISOString().slice(0, 16),
      status: 'planned',
    },
    perAccount: usableAccounts.map((account, index) => ({
      accountId: account.id,
      accountName: account.alias || account.name,
      riskAmount: index === 0 ? 100 : 65,
      investmentPercent: index === 0 ? 1.2 : 0.8,
    })),
  };

  createMarketEntriesForAccounts(userEmail, input);
}
