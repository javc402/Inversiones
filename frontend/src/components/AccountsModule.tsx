import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
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
import { useSystemConfig } from '@hooks/useSystemConfig';
import '../styles/accounts-module.css';

type ModalMode = 'create' | 'edit';

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
  }, [open]);

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
    const popoverWidth = 220;
    const viewportPadding = 12;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - popoverWidth - viewportPadding));

    setPopoverPos({
      top: rect.top - 50,
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
  }, [open]);

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
            className="account-summary-popover is-open"
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
  leverage: '1:100',
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

function toNumberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toStringOrEmpty(value: number | null): string {
  return value === null ? '' : String(value);
}

function mapAccountToForm(account: TradingAccount): AccountFormState {
  return {
    name: account.name,
    alias: account.alias ?? '',
    broker_name: account.broker_name,
    account_type: account.account_type,
    platform: account.platform,
    base_currency: account.base_currency,
    leverage: account.leverage ?? '',
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

function mapFormToPayload(form: AccountFormState): UpsertTradingAccountInput {
  return {
    name: form.name.trim(),
    alias: form.alias.trim() || undefined,
    broker_name: form.broker_name.trim(),
    account_type: form.account_type,
    platform: form.platform,
    base_currency: form.base_currency.trim().toUpperCase(),
    leverage: form.leverage.trim() || undefined,
    initial_balance: Number(form.initial_balance),
    initial_equity: toNumberOrUndefined(form.initial_equity),
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
  label: string;
  operations: number;
  sl: number;
  tpNoProfit: number;
  tpProfit: number;
}

function getSummaryRows(): AccountSummaryRow[] {
  return [
    {
      label: 'Total',
      operations: 0,
      sl: 0,
      tpNoProfit: 0,
      tpProfit: 0,
    },
    {
      label: 'Año',
      operations: 0,
      sl: 0,
      tpNoProfit: 0,
      tpProfit: 0,
    },
    {
      label: 'Mes',
      operations: 0,
      sl: 0,
      tpNoProfit: 0,
      tpProfit: 0,
    },
    {
      label: 'Semana',
      operations: 0,
      sl: 0,
      tpNoProfit: 0,
      tpProfit: 0,
    },
  ];
}

export default function AccountsModule() {
  const { config } = useSystemConfig();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TradingAccountStatus>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormState>(DEFAULT_FORM);

  useEffect(() => {
    void loadAccounts();
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [modalOpen]);

  async function loadAccounts() {
    setLoading(true);
    setError(null);

    try {
      const data = await listTradingAccounts();
      setAccounts(data);
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

  const accountsContent = useMemo(() => {
    if (loading) {
      return <p className="accounts-loading">Cargando cuentas...</p>;
    }

    if (filteredAccounts.length === 0) {
      return <p className="accounts-empty">Aun no tienes cuentas registradas.</p>;
    }

    const summaryRows = getSummaryRows();

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
              <div className="account-avatar" aria-hidden="true">
                {account.name.charAt(0).toUpperCase()}
              </div>
              <div className="account-head-copy">
                <h3>{account.name}</h3>
                <p className="account-id">Balance actual: ${account.initial_balance.toLocaleString()}</p>
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

            <div className="account-summary-wrap">
              <p className="account-summary-title">Resumen operativo</p>
              <div className="account-summary-table-scroll">
                <table className="account-summary-table" aria-label="Resumen de operaciones por periodo">
                  <thead>
                    <tr>
                      <th scope="col" className="account-summary-header">Tiempo</th>
                      <TableHeaderWithPopover description="Número total de operaciones">Ops</TableHeaderWithPopover>
                      <TableHeaderWithPopover description="Operaciones cerradas con Stop Loss">SL</TableHeaderWithPopover>
                      <TableHeaderWithPopover description="Operaciones en Take Profit sin ganancia">TP (-)</TableHeaderWithPopover>
                      <TableHeaderWithPopover description="Operaciones en Take Profit con ganancia">TP (+)</TableHeaderWithPopover>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((row) => (
                      <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        <td>{row.operations}</td>
                        <td>{row.sl}</td>
                        <td>{row.tpNoProfit}</td>
                        <td>{row.tpProfit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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
  }, [filteredAccounts, loading]);

  function openCreateModal() {
    setModalMode('create');
    setEditingAccountId(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  }

  function openEditModal(account: TradingAccount) {
    setModalMode('edit');
    setEditingAccountId(account.id);
    setForm(mapAccountToForm(account));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingAccountId(null);
    setForm(DEFAULT_FORM);
  }

  function handleFormChange<K extends keyof AccountFormState>(key: K, value: AccountFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const payload = mapFormToPayload(form);

      if (modalMode === 'create') {
        await createTradingAccount(payload);
      } else if (editingAccountId) {
        await updateTradingAccount(editingAccountId, payload);
      }

      closeModal();
      await loadAccounts();
    } catch (requestError) {
      setError('No fue posible guardar la cuenta. Revisa los datos e intenta nuevamente.');
      console.error(requestError);
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
          onChange={(event) => setTypeFilter(event.target.value)}
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
        <dialog className="accounts-modal-overlay" open aria-label="Formulario cuenta">
          <div className="accounts-modal">
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
                <FieldLabel text="Alias" help="Nombre corto opcional para mostrar la cuenta en tarjetas o listados compactos." />
                <input
                  value={form.alias}
                  onChange={(event) => handleFormChange('alias', event.target.value)}
                />
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
                <FieldLabel text="Apalancamiento" help="Relación de apalancamiento asignada por el broker o firma para esta cuenta." />
                <input
                  value={form.leverage}
                  onChange={(event) => handleFormChange('leverage', event.target.value)}
                />
              </label>

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
                <FieldLabel text="Equity inicial" help="Equity de referencia al inicio, útil para comparar desempeño y variación." />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.initial_equity}
                  onChange={(event) => handleFormChange('initial_equity', event.target.value)}
                />
              </label>

              <label>
                <FieldLabel text="Fecha apertura *" help="Fecha en la que la cuenta comenzó a operar o fue habilitada." />
                <input
                  type="date"
                  value={form.opened_at}
                  onChange={(event) => handleFormChange('opened_at', event.target.value)}
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

              <div className="accounts-section-title">Gestion de riesgo</div>

              <label>
                <FieldLabel text="Riesgo max por operación %" help="Porcentaje máximo del capital que arriesgas en cada entrada." />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.risk_per_trade_pct}
                  onChange={(event) => handleFormChange('risk_per_trade_pct', event.target.value)}
                />
              </label>

              <label>
                <FieldLabel text="Riesgo diario max %" help="Límite de pérdida permitida acumulada durante una jornada de trading." />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_daily_risk_pct}
                  onChange={(event) => handleFormChange('max_daily_risk_pct', event.target.value)}
                />
              </label>

              <label>
                <FieldLabel text="Drawdown max permitido %" help="Máxima caída de capital aceptada antes de detener operativa o revisar estrategia." />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_drawdown_pct}
                  onChange={(event) => handleFormChange('max_drawdown_pct', event.target.value)}
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
                <button type="button" className="secondary-btn" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="primary-btn">
                  Guardar cuenta
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </section>
  );
}
