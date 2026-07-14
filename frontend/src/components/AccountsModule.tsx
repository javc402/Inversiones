import { FormEvent, useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon } from './AppIcon';
import {
  TradingAccount,
  TradingAccountStatus,
  TradingAccountType,
  createTradingAccount,
  listTradingAccounts,
  toggleTradingAccountStatus,
  toggleTradingAccountFavorite,
  updateTradingAccount,
  UpsertTradingAccountInput,
} from '@services/accounts';
import { listMarketEntriesByUser, MarketEntry } from '@services/market-entries';
import { openDatePicker, preventManualDatePasteOrDrop, preventManualDateTyping } from '@lib/dateInputGuards';
import { useSystemConfig } from '@hooks/useSystemConfig';
import '../styles/accounts-module.css';

type ModalMode = 'create' | 'edit';
const DEFAULT_LEVERAGE = '1:100';

function useDismissiblePopover(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  popoverRef: RefObject<HTMLElement | null>,
  setOpen: Dispatch<SetStateAction<boolean>>
) {
  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, triggerRef, popoverRef, setOpen]);
}

function FieldLabel({ text, help }: Readonly<{ text: string; help: string }>) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  function updatePosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const popoverWidth = 260;
    const viewportPadding = 12;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - popoverWidth - viewportPadding));

    setPopoverPos({
      top: rect.bottom + 10,
      left,
    });
  }

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handleViewportChange = () => updatePosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  useDismissiblePopover(open, triggerRef, popoverRef, setOpen);

  return (
    <span className="accounts-field-label">
      {text}
      <button
        type="button"
        className="accounts-help-trigger"
        aria-label={`Ayuda: ${text}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        ref={triggerRef}
      >
        ?
      </button>
      {open &&
        createPortal(
          <div
            className="accounts-help-popover is-open"
            role="tooltip"
            style={{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }}
            ref={popoverRef}
          >
            {help}
          </div>,
          document.body
        )}
    </span>
  );
}

function TableHeaderWithPopover({ children, description }: Readonly<{ children: string; description: string }>) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLTableCellElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  function updatePosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const popoverWidth = 260;
    const viewportPadding = 12;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - popoverWidth - viewportPadding));

    setPopoverPos({
      top: rect.bottom + 10,
      left,
    });
  }

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handleViewportChange = () => updatePosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  useDismissiblePopover(open, triggerRef, popoverRef, setOpen);

  return (
    <>
      <th
        scope="col"
        ref={triggerRef}
        className="account-summary-header"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((prev) => !prev)}
      >
        {children}
      </th>
      {open &&
        createPortal(
          <div
            className="accounts-help-popover is-open"
            role="tooltip"
            style={{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }}
            ref={popoverRef}
          >
            {description}
          </div>,
          document.body
        )}
    </>
  );
}

interface AccountFormState {
  name: string;
  alias: string;
  broker_name: string;
  account_type: TradingAccountType;
  platform: 'mt4' | 'mt5' | 'ctrader' | 'other';
  base_currency: string;
  leverage: string;
  initial_balance: string;
  initial_equity: string;
  opened_at: string;
  status: TradingAccountStatus;
  risk_per_trade_pct: string;
  max_daily_risk_pct: string;
  max_drawdown_pct: string;
  funding_firm: string;
  challenge_phase: string;
  profit_target_pct: string;
  daily_loss_limit_pct: string;
  max_loss_limit_pct: string;
  payout_cycle: string;
  notes: string;
}

const DEFAULT_FORM: AccountFormState = {
  name: '',
  alias: '',
  broker_name: '',
  account_type: 'real',
  platform: 'mt5',
  base_currency: 'USD',
  leverage: DEFAULT_LEVERAGE,
  initial_balance: '',
  initial_equity: '',
  opened_at: new Date().toISOString().slice(0, 10),
  status: 'active',
  risk_per_trade_pct: '',
  max_daily_risk_pct: '',
  max_drawdown_pct: '',
  funding_firm: '',
  challenge_phase: 'phase_1',
  profit_target_pct: '',
  daily_loss_limit_pct: '',
  max_loss_limit_pct: '',
  payout_cycle: 'monthly',
  notes: '',
};

export function toNumberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function toStringOrEmpty(value: number | null): string {
  return value === null ? '' : String(value);
}

export function mapAccountToForm(account: TradingAccount): AccountFormState {
  return {
    name: account.name,
    alias: account.alias ?? '',
    broker_name: account.broker_name,
    account_type: account.account_type,
    platform: account.platform,
    base_currency: account.base_currency,
    leverage: account.leverage ?? DEFAULT_LEVERAGE,
    initial_balance: String(account.initial_balance),
    initial_equity: toStringOrEmpty(account.initial_equity),
    opened_at: account.opened_at.slice(0, 10),
    status: account.status,
    risk_per_trade_pct: toStringOrEmpty(account.risk_per_trade_pct),
    max_daily_risk_pct: toStringOrEmpty(account.max_daily_risk_pct),
    max_drawdown_pct: toStringOrEmpty(account.max_drawdown_pct),
    funding_firm: account.funding_firm ?? '',
    challenge_phase: account.challenge_phase ?? 'phase_1',
    profit_target_pct: toStringOrEmpty(account.profit_target_pct),
    daily_loss_limit_pct: toStringOrEmpty(account.daily_loss_limit_pct),
    max_loss_limit_pct: toStringOrEmpty(account.max_loss_limit_pct),
    payout_cycle: account.payout_cycle ?? 'monthly',
    notes: account.notes ?? '',
  };
}

export function mapFormToPayload(form: AccountFormState): UpsertTradingAccountInput {
  const normalizedName = form.name.trim();
  const normalizedInitialBalance = Number(form.initial_balance);

  return {
    name: normalizedName,
    alias: normalizedName || undefined,
    broker_name: form.broker_name.trim(),
    account_type: form.account_type,
    platform: form.platform,
    base_currency: form.base_currency.trim().toUpperCase(),
    leverage: DEFAULT_LEVERAGE,
    initial_balance: normalizedInitialBalance,
    initial_equity: Number.isFinite(normalizedInitialBalance) ? normalizedInitialBalance : undefined,
    opened_at: form.opened_at,
    status: form.status,
    risk_per_trade_pct: toNumberOrUndefined(form.risk_per_trade_pct),
    max_daily_risk_pct: toNumberOrUndefined(form.max_daily_risk_pct),
    max_drawdown_pct: toNumberOrUndefined(form.max_drawdown_pct),
    funding_firm: form.account_type === 'funded' ? form.funding_firm.trim() || undefined : undefined,
    challenge_phase: form.account_type === 'funded' ? form.challenge_phase : undefined,
    profit_target_pct: form.account_type === 'funded' ? toNumberOrUndefined(form.profit_target_pct) : undefined,
    daily_loss_limit_pct:
      form.account_type === 'funded' ? toNumberOrUndefined(form.daily_loss_limit_pct) : undefined,
    max_loss_limit_pct:
      form.account_type === 'funded' ? toNumberOrUndefined(form.max_loss_limit_pct) : undefined,
    payout_cycle: form.account_type === 'funded' ? form.payout_cycle : undefined,
    notes: form.notes.trim() || undefined,
  };
}

interface AccountSummaryRow {
  key: 'total' | 'year' | 'month' | 'week';
  label: string;
  operations: number;
  tpProfit: number;
  sl: number;
  breakeven: number;
  so: number;
}

function getIsoWeekInfo(date: Date): { year: number; week: number } {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayOfWeek);

  const isoYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return { year: isoYear, week };
}

function getCurrentMonthLabel(date: Date): string {
  const month = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(date);
  return month.charAt(0).toUpperCase() + month.slice(1);
}

export function getSummaryRows(referenceDate: Date = new Date()): AccountSummaryRow[] {
  const isoWeek = getIsoWeekInfo(referenceDate);

  return [
    {
      key: 'total',
      label: 'Total',
      operations: 0,
      tpProfit: 0,
      sl: 0,
      breakeven: 0,
      so: 0,
    },
    {
      key: 'year',
      label: `Año ${referenceDate.getFullYear()}`,
      operations: 0,
      tpProfit: 0,
      sl: 0,
      breakeven: 0,
      so: 0,
    },
    {
      key: 'month',
      label: `Mes ${getCurrentMonthLabel(referenceDate)}`,
      operations: 0,
      tpProfit: 0,
      sl: 0,
      breakeven: 0,
      so: 0,
    },
    {
      key: 'week',
      label: `Semana ${isoWeek.week}`,
      operations: 0,
      tpProfit: 0,
      sl: 0,
      breakeven: 0,
      so: 0,
    },
  ];
}

function parseEntryReferenceDate(entry: Pick<MarketEntry, 'plannedAt' | 'updatedAt' | 'createdAt'>): Date | null {
  const planned = new Date(entry.plannedAt);
  if (!Number.isNaN(planned.getTime())) return planned;

  const updated = new Date(entry.updatedAt);
  if (!Number.isNaN(updated.getTime())) return updated;

  const created = new Date(entry.createdAt);
  if (!Number.isNaN(created.getTime())) return created;

  return null;
}

function compareEntriesByReferenceDate(a: MarketEntry, b: MarketEntry): number {
  const dateA = parseEntryReferenceDate(a)?.getTime() ?? Number.POSITIVE_INFINITY;
  const dateB = parseEntryReferenceDate(b)?.getTime() ?? Number.POSITIVE_INFINITY;

  if (dateA !== dateB) {
    return dateA - dateB;
  }

  return a.createdAt.localeCompare(b.createdAt) || a.updatedAt.localeCompare(b.updatedAt) || a.id.localeCompare(b.id);
}

function getEntryFinancialAmount(entry: MarketEntry): number {
  if (entry.status !== 'closed' || entry.resultR === null) {
    return 0;
  }

  if (entry.resultR === 1) {
    return 0;
  }

  return entry.riskAmount * entry.resultR;
}

export function calculateAccountCurrentBalance(initialBalance: number, entries: MarketEntry[]): number {
  const sortedEntries = [...entries].sort(compareEntriesByReferenceDate);
  const finalBalance = sortedEntries.reduce((balance, entry) => balance + getEntryFinancialAmount(entry), initialBalance);

  return Number(finalBalance.toFixed(2));
}

type AccountBalanceStatus = 'above' | 'below' | 'equal';

function getAccountBalanceStatus(currentBalance: number, initialBalance: number): AccountBalanceStatus {
  if (currentBalance > initialBalance) return 'above';
  if (currentBalance < initialBalance) return 'below';
  return 'equal';
}

function getAccountBalanceStatusCopy(status: AccountBalanceStatus): { label: string; icon: 'trendingUp' | 'trendingDown' | 'horizontalRule' } {
  if (status === 'above') return { label: 'Por encima del balance inicial', icon: 'trendingUp' };
  if (status === 'below') return { label: 'Por debajo del balance inicial', icon: 'trendingDown' };
  return { label: 'En breakeven con el balance inicial', icon: 'horizontalRule' };
}

function isInSameWeek(reference: Date, now: Date): boolean {
  const referenceWeek = getIsoWeekInfo(reference);
  const currentWeek = getIsoWeekInfo(now);

  return referenceWeek.year === currentWeek.year && referenceWeek.week === currentWeek.week;
}

function buildSummaryRowsForAccount(entries: MarketEntry[], now: Date): AccountSummaryRow[] {
  const baseRows = getSummaryRows();

  const operationEntries = entries.filter((entry) =>
    (entry.status === 'closed' && entry.resultR !== null) || entry.status === 'no_entry'
  );

  const segmented = {
    total: operationEntries,
    year: operationEntries.filter((entry) => {
      const date = parseEntryReferenceDate(entry);
      return Boolean(date && date.getFullYear() === now.getFullYear());
    }),
    month: operationEntries.filter((entry) => {
      const date = parseEntryReferenceDate(entry);
      return Boolean(
        date &&
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    }),
    week: operationEntries.filter((entry) => {
      const date = parseEntryReferenceDate(entry);
      return Boolean(date && isInSameWeek(date, now));
    }),
  } as const;

  return baseRows.map((row) => {
    const periodEntries = segmented[row.key] ?? [];

    return {
      ...row,
      operations: periodEntries.length,
      tpProfit: periodEntries.filter((entry) => entry.status === 'closed' && (entry.resultR ?? 0) > 1).length,
      sl: periodEntries.filter((entry) => (entry.resultR ?? 0) < 0).length,
      breakeven: periodEntries.filter((entry) => (entry.resultR ?? 0) === 1).length,
      so: periodEntries.filter((entry) => entry.status === 'no_entry').length,
    };
  });
}

function buildSummaryRowsByAccount(entries: MarketEntry[], now: Date): Map<string, AccountSummaryRow[]> {
  const byAccount = new Map<string, MarketEntry[]>();

  for (const entry of entries) {
    const bucket = byAccount.get(entry.accountId) ?? [];
    bucket.push(entry);
    byAccount.set(entry.accountId, bucket);
  }

  const result = new Map<string, AccountSummaryRow[]>();
  for (const [accountId, accountEntries] of byAccount.entries()) {
    result.set(accountId, buildSummaryRowsForAccount(accountEntries, now));
  }

  return result;
}

export default function AccountsModule() {
  const { config } = useSystemConfig();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [entries, setEntries] = useState<MarketEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TradingAccountType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TradingAccountStatus>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormState>(DEFAULT_FORM);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const accountsModalRef = useRef<HTMLDivElement | null>(null);
  const saveAccountLockRef = useRef(false);

  useEffect(() => {
    void loadAccounts();
  }, []);

  useEffect(() => {
    function handleEntriesChanged() {
      void loadAccounts();
    }

    window.addEventListener('inversiones:entries-changed', handleEntriesChanged as EventListener);

    return () => {
      window.removeEventListener('inversiones:entries-changed', handleEntriesChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (accountsModalRef.current?.contains(target)) {
        return;
      }

      closeModal();
    }

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [modalOpen]);

  async function loadAccounts() {
    setLoading(true);
    setError(null);

    try {
      const [data, loadedEntries] = await Promise.all([
        listTradingAccounts(),
        listMarketEntriesByUser('accounts-module'),
      ]);
      setAccounts(data);
      setEntries(loadedEntries);
    } catch (requestError) {
      setError('No fue posible cargar las cuentas.');
      console.error(requestError);
    } finally {
      setLoading(false);
    }
  }

  const filteredAccounts = useMemo(() => {
    const filtered = accounts.filter((account) => {
      const matchesQuery =
        !query ||
        account.name.toLowerCase().includes(query.toLowerCase()) ||
        (account.alias ?? '').toLowerCase().includes(query.toLowerCase()) ||
        account.broker_name.toLowerCase().includes(query.toLowerCase());

      const matchesType = typeFilter === 'all' || account.account_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || account.status === statusFilter;

      return matchesQuery && matchesType && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      if (a.is_favorite === b.is_favorite) return 0;
      return a.is_favorite ? -1 : 1;
    });
  }, [accounts, query, typeFilter, statusFilter]);

  const summaryRowsByAccount = useMemo(() => {
    return buildSummaryRowsByAccount(entries, new Date());
  }, [entries]);

  const currentBalanceByAccount = useMemo(() => {
    const byAccount = new Map<string, MarketEntry[]>();

    for (const entry of entries) {
      const bucket = byAccount.get(entry.accountId) ?? [];
      bucket.push(entry);
      byAccount.set(entry.accountId, bucket);
    }

    const result = new Map<string, number>();
    for (const account of accounts) {
      result.set(account.id, calculateAccountCurrentBalance(account.initial_balance, byAccount.get(account.id) ?? []));
    }

    return result;
  }, [accounts, entries]);

  const accountBalanceStatusByAccount = useMemo(() => {
    const result = new Map<string, AccountBalanceStatus>();

    for (const account of accounts) {
      const currentBalance = currentBalanceByAccount.get(account.id) ?? account.initial_balance;
      result.set(account.id, getAccountBalanceStatus(currentBalance, account.initial_balance));
    }

    return result;
  }, [accounts, currentBalanceByAccount]);

  const isFundedAccount = form.account_type === 'funded';

  const accountsContent = useMemo(() => {
    if (loading) {
      return <p className="accounts-loading">Cargando cuentas...</p>;
    }

    if (filteredAccounts.length === 0) {
      return <p className="accounts-empty">Aun no tienes cuentas registradas.</p>;
    }

    return (
      <div className="accounts-grid">
        {filteredAccounts.map((account) => (
          <article
            key={account.id}
            className={`account-card account-card-${account.status === 'active' ? 'active' : 'inactive'}`}
          >
            <button
              type="button"
              className={`account-favorite-btn ${account.is_favorite ? 'is-favorite' : ''}`}
              title={account.is_favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              aria-label={account.is_favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              onClick={() => void handleToggleFavorite(account)}
            >
              <AppIcon name={account.is_favorite ? 'star' : 'starOutline'} />
            </button>

            <div className="account-card-head">
              {(() => {
                const currentBalance = currentBalanceByAccount.get(account.id) ?? account.initial_balance;
                const status = accountBalanceStatusByAccount.get(account.id) ?? getAccountBalanceStatus(currentBalance, account.initial_balance);
                const copy = getAccountBalanceStatusCopy(status);

                return (
                  <div className={`account-avatar account-avatar-${status}`} title={copy.label} aria-label={copy.label}>
                    <AppIcon name={copy.icon} className="account-avatar-icon" />
                  </div>
                );
              })()}
              <div className="account-head-copy">
                <h3>{account.name}</h3>
                <p className="account-id">Balance actual: {(currentBalanceByAccount.get(account.id) ?? account.initial_balance).toLocaleString()} {account.base_currency}</p>
              </div>
            </div>

            <div className="account-chip-row">
              <span className={`account-status-chip account-status-chip-${account.status}`}>
                {account.status === 'active' ? 'ACTIVA' : 'INACTIVA'}
              </span>
            </div>

            <div className="account-chip-row">
              <span className="account-type-pill">{account.account_type.toUpperCase()}</span>
            </div>

            <div className="account-contact-lines">
              <p>
                <strong>Alias:</strong> {account.alias || '-'}
              </p>
              <p>
                <strong>Broker/Firma:</strong> {account.broker_name}
              </p>
              <p>
                <strong>Plataforma:</strong> {account.platform.toUpperCase()}
              </p>
              <p>
                <strong>Balance inicial:</strong> {account.initial_balance.toLocaleString()} {account.base_currency}
              </p>
              <p>
                <strong>Riesgo/Trade:</strong> {account.risk_per_trade_pct ?? '-'}%
              </p>
            </div>

          {(() => {
            const summaryRows = summaryRowsByAccount.get(account.id) ?? getSummaryRows();
            return (
            <div className="account-summary-wrap">
              <p className="account-summary-title">Resumen operativo</p>
              <div className="account-summary-table-scroll">
                <table className="account-summary-table" aria-label="Resumen de operaciones por periodo">
                  <thead>
                    <tr>
                      <th scope="col" className="account-summary-header">Tiempo</th>
                      <TableHeaderWithPopover description="Número total de operaciones">Ops</TableHeaderWithPopover>
                      <TableHeaderWithPopover description="Operaciones cerradas en Take Profit con ganancia">TP (+)</TableHeaderWithPopover>
                      <TableHeaderWithPopover description="Operaciones cerradas con Stop Loss">SL</TableHeaderWithPopover>
                      <TableHeaderWithPopover description="Operaciones en punto de equilibrio técnico (R = 1)">Bk</TableHeaderWithPopover>
                      <TableHeaderWithPopover description="Registros sin operar (estado Sin entrada)">SO</TableHeaderWithPopover>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((row) => (
                      <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        <td>{row.operations}</td>
                        <td>{row.tpProfit}</td>
                        <td>{row.sl}</td>
                        <td>{row.breakeven}</td>
                        <td>{row.so}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })()}

            <div className="account-card-footer">
              <p className="account-footer-date">Apertura: {account.opened_at.slice(0, 10)}</p>
              <div className="account-card-actions">
                <button
                  type="button"
                  className="account-icon-btn account-icon-edit"
                  title="Editar cuenta"
                  aria-label="Editar cuenta"
                  onClick={() => openEditModal(account)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="account-icon-btn account-icon-toggle"
                  title={account.status === 'active' ? 'Inactivar cuenta' : 'Activar cuenta'}
                  aria-label={account.status === 'active' ? 'Inactivar cuenta' : 'Activar cuenta'}
                  onClick={() => void handleToggleStatus(account)}
                >
                  {account.status === 'active' ? '⏻' : '▶'}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }, [filteredAccounts, loading, summaryRowsByAccount]);

  function openCreateModal() {
    setModalMode('create');
    setEditingAccountId(null);
    saveAccountLockRef.current = false;
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  }

  function openEditModal(account: TradingAccount) {
    setModalMode('edit');
    setEditingAccountId(account.id);
    saveAccountLockRef.current = false;
    setForm(mapAccountToForm(account));
    setModalOpen(true);
  }

  function closeModal() {
    saveAccountLockRef.current = false;
    setModalOpen(false);
    setEditingAccountId(null);
    setForm(DEFAULT_FORM);
  }

  function handleFormChange<K extends keyof AccountFormState>(key: K, value: AccountFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function notifyAccountsChanged(action: ModalMode) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('inversiones:accounts-changed', { detail: { action } }));
  }

  async function handleSaveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveAccountLockRef.current) return;

    saveAccountLockRef.current = true;
    let saveSucceeded = false;
    setIsSavingAccount(true);
    setError(null);

    try {
      const payload = mapFormToPayload(form);

      if (modalMode === 'create') {
        payload.initial_equity = payload.initial_balance;
        await createTradingAccount(payload);
      } else if (editingAccountId) {
        await updateTradingAccount(editingAccountId, payload);
      }

      closeModal();
      await loadAccounts();
      notifyAccountsChanged(modalMode);
      saveSucceeded = true;
    } catch (requestError) {
      setError('No fue posible guardar la cuenta. Revisa los datos e intenta nuevamente.');
      console.error(requestError);
    } finally {
      if (!saveSucceeded) {
        saveAccountLockRef.current = false;
      }
      setIsSavingAccount(false);
    }
  }

  async function handleToggleStatus(account: TradingAccount) {
    try {
      const nextStatus = await toggleTradingAccountStatus(account.id, account.status);
      setAccounts((prev) =>
        prev.map((item) => (item.id === account.id ? { ...item, status: nextStatus } : item))
      );
    } catch (requestError) {
      setError('No fue posible actualizar el estado de la cuenta.');
      console.error(requestError);
    }
  }

  async function handleToggleFavorite(account: TradingAccount) {
    try {
      const nextIsFavorite = await toggleTradingAccountFavorite(account.id, account.is_favorite);
      setAccounts((prev) =>
        prev.map((item) => (item.id === account.id ? { ...item, is_favorite: nextIsFavorite } : item))
      );
    } catch (requestError) {
      setError('No fue posible actualizar el estado de favorito de la cuenta.');
      console.error(requestError);
    }
  }

  return (
    <section className="accounts-module" aria-label="Gestion de cuentas">
      <header className="accounts-toolbar">
        <button type="button" className="primary-btn accounts-new-btn" onClick={openCreateModal}>
          + Nueva cuenta
        </button>

        <input
          className="accounts-search"
          type="search"
          placeholder="Buscar por nombre, alias o broker"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Buscar cuentas"
        />

        <select
          className="accounts-filter"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as 'all' | TradingAccountType)}
          aria-label="Filtrar por tipo"
        >
          <option value="all">Tipo: Todos</option>
          {config.accountTypes.map((item) => (
            <option key={item.id} value={item.value}>{item.label}</option>
          ))}
        </select>

        <select
          className="accounts-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | TradingAccountStatus)}
          aria-label="Filtrar por estado"
        >
          <option value="all">Estado: Todos</option>
          <option value="active">Activa</option>
          <option value="inactive">Inactiva</option>
        </select>
      </header>

      {error && <p className="accounts-error">{error}</p>}

      {accountsContent}

      {modalOpen && (
        <dialog
          className="accounts-modal-overlay"
          open
          aria-label="Formulario cuenta"
          onCancel={(event) => {
            event.preventDefault();
            closeModal();
          }}
        >
          <div className="accounts-modal" ref={accountsModalRef}>
            <h2>{modalMode === 'create' ? 'Crear cuenta' : 'Editar cuenta'}</h2>
            <p className="accounts-modal-description">
              {modalMode === 'create'
                ? 'Define la estructura de la cuenta, su capital inicial y los límites de riesgo para incorporarla a tu portafolio con trazabilidad operativa.'
                : 'Actualiza la estructura de la cuenta, su capital y sus límites de riesgo para mantenerla alineada con tu plan de trading.'}
            </p>

            <form className="accounts-form" onSubmit={handleSaveAccount}>
              <div className="accounts-section-title">Datos de la cuenta</div>

              <label>
                <FieldLabel text="Nombre de la cuenta *" help="Nombre principal para identificar la cuenta dentro del sistema y en los reportes." />
                <input
                  value={form.name}
                  onChange={(event) => handleFormChange('name', event.target.value)}
                  required
                />
              </label>

              <label>
                <FieldLabel text="Estado *" help="Define si la cuenta está activa para seguimiento o inactiva temporalmente." />
                <select
                  value={form.status}
                  onChange={(event) => handleFormChange('status', event.target.value as TradingAccountStatus)}
                >
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                </select>
              </label>

              <label>
                <FieldLabel text="Broker/Firma *" help="Entidad donde opera la cuenta: broker tradicional o firma de fondeo." />
                <input
                  value={form.broker_name}
                  onChange={(event) => handleFormChange('broker_name', event.target.value)}
                  required
                />
              </label>

              <label>
                <FieldLabel text="Tipo de cuenta *" help="Clasificación operativa de la cuenta (real, demo o fondeo)." />
                <select
                  value={form.account_type}
                  onChange={(event) => handleFormChange('account_type', event.target.value as TradingAccountType)}
                >
                  {config.accountTypes.map((item) => (
                    <option key={item.id} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <FieldLabel text="Plataforma *" help="Plataforma de ejecución donde está configurada esta cuenta." />
                <select
                  value={form.platform}
                  onChange={(event) =>
                    handleFormChange('platform', event.target.value as 'mt4' | 'mt5' | 'ctrader' | 'other')
                  }
                >
                  {config.platforms.map((item) => (
                    <option key={item.id} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <FieldLabel text="Moneda base *" help="Divisa principal en la que se expresan balance, equity y métricas." />
                <select
                  value={form.base_currency}
                  onChange={(event) => handleFormChange('base_currency', event.target.value)}
                  required
                  aria-label="Moneda base *"
                >
                  {config.currencies.map((item) => (
                    <option key={item.id} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <div className="accounts-section-title">Capital inicial y operativa</div>

              <label>
                <FieldLabel text="Balance inicial *" help="Capital con el que inicia la cuenta al momento del registro." />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.initial_balance}
                  onChange={(event) => handleFormChange('initial_balance', event.target.value)}
                  required
                />
              </label>

              <label>
                <FieldLabel text="Fecha apertura *" help="Fecha en la que la cuenta comenzó a operar o fue habilitada." />
                <input
                  type="date"
                  value={form.opened_at}
                  onChange={(event) => handleFormChange('opened_at', event.target.value)}
                  inputMode="none"
                  onFocus={openDatePicker}
                  onClick={openDatePicker}
                  onKeyDown={preventManualDateTyping}
                  onPaste={preventManualDatePasteOrDrop}
                  onDrop={preventManualDatePasteOrDrop}
                  required
                />
              </label>

              <div className="accounts-section-title">Gestion de riesgo</div>

              <label>
                <FieldLabel
                  text={`Riesgo max por operación %${isFundedAccount ? ' *' : ''}`}
                  help="Porcentaje máximo del capital que arriesgas en cada entrada."
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.risk_per_trade_pct}
                  onChange={(event) => handleFormChange('risk_per_trade_pct', event.target.value)}
                  required={isFundedAccount}
                  aria-required={isFundedAccount}
                />
              </label>

              <label>
                <FieldLabel
                  text={`Riesgo diario max %${isFundedAccount ? ' *' : ''}`}
                  help="Límite de pérdida permitida acumulada durante una jornada de trading."
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_daily_risk_pct}
                  onChange={(event) => handleFormChange('max_daily_risk_pct', event.target.value)}
                  required={isFundedAccount}
                  aria-required={isFundedAccount}
                />
              </label>

              <label>
                <FieldLabel
                  text={`Drawdown max permitido %${isFundedAccount ? ' *' : ''}`}
                  help="Máxima caída de capital aceptada antes de detener operativa o revisar estrategia."
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_drawdown_pct}
                  onChange={(event) => handleFormChange('max_drawdown_pct', event.target.value)}
                  required={isFundedAccount}
                  aria-required={isFundedAccount}
                />
              </label>

              {form.account_type === 'funded' && (
                <>
                  <div className="accounts-section-title">Reglas de fondeo</div>

                  <label>
                    <FieldLabel text="Firma de fondeo" help="Nombre de la empresa que provee el capital para esta cuenta." />
                    <input
                      value={form.funding_firm}
                      onChange={(event) => handleFormChange('funding_firm', event.target.value)}
                    />
                  </label>

                  <label>
                    <FieldLabel text="Fase desafío" help="Etapa actual del proceso de evaluación o fondeo de la cuenta." />
                    <select
                      value={form.challenge_phase}
                      onChange={(event) => handleFormChange('challenge_phase', event.target.value)}
                    >
                      <option value="phase_1">Phase 1</option>
                      <option value="phase_2">Phase 2</option>
                      <option value="funded">Funded</option>
                    </select>
                  </label>

                  <label>
                    <FieldLabel text="Target beneficio %" help="Objetivo porcentual de ganancia requerido por la firma de fondeo." />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.profit_target_pct}
                      onChange={(event) => handleFormChange('profit_target_pct', event.target.value)}
                    />
                  </label>

                  <label>
                    <FieldLabel text="Límite pérdida diaria %" help="Pérdida diaria máxima permitida según reglas de la firma." />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.daily_loss_limit_pct}
                      onChange={(event) => handleFormChange('daily_loss_limit_pct', event.target.value)}
                    />
                  </label>

                  <label>
                    <FieldLabel text="Límite pérdida total %" help="Drawdown total máximo permitido por la firma durante todo el proceso." />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.max_loss_limit_pct}
                      onChange={(event) => handleFormChange('max_loss_limit_pct', event.target.value)}
                    />
                  </label>

                  <label>
                    <FieldLabel text="Ciclo de pago" help="Frecuencia en la que la firma liquida beneficios de la cuenta." />
                    <select
                      value={form.payout_cycle}
                      onChange={(event) => handleFormChange('payout_cycle', event.target.value)}
                    >
                      <option value="biweekly">Quincenal</option>
                      <option value="monthly">Mensual</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </label>
                </>
              )}

              <label className="accounts-notes-field">
                <FieldLabel text="Observaciones" help="Notas internas relevantes sobre operativa, condiciones o seguimiento de la cuenta." />
                <textarea
                  value={form.notes}
                  onChange={(event) => handleFormChange('notes', event.target.value)}
                  rows={3}
                />
              </label>

              <div className="accounts-form-actions">
                <button type="button" className="secondary-btn" onClick={closeModal} disabled={isSavingAccount}>
                  Cancelar
                </button>
                <button type="submit" className="primary-btn" disabled={isSavingAccount}>
                  {isSavingAccount ? 'Guardando...' : 'Guardar cuenta'}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </section>
  );
}
