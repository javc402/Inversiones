import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  TradingAccount,
  TradingAccountStatus,
  TradingAccountType,
  createTradingAccount,
  listTradingAccounts,
  toggleTradingAccountStatus,
  updateTradingAccount,
  UpsertTradingAccountInput,
} from '@services/accounts';
import '../styles/accounts-module.css';

type ModalMode = 'create' | 'edit';

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
    initial_equity: account.initial_equity !== null ? String(account.initial_equity) : '',
    opened_at: account.opened_at.slice(0, 10),
    status: account.status,
    risk_per_trade_pct: account.risk_per_trade_pct !== null ? String(account.risk_per_trade_pct) : '',
    max_daily_risk_pct: account.max_daily_risk_pct !== null ? String(account.max_daily_risk_pct) : '',
    max_drawdown_pct: account.max_drawdown_pct !== null ? String(account.max_drawdown_pct) : '',
    funding_firm: account.funding_firm ?? '',
    challenge_phase: account.challenge_phase ?? 'phase_1',
    profit_target_pct: account.profit_target_pct !== null ? String(account.profit_target_pct) : '',
    daily_loss_limit_pct: account.daily_loss_limit_pct !== null ? String(account.daily_loss_limit_pct) : '',
    max_loss_limit_pct: account.max_loss_limit_pct !== null ? String(account.max_loss_limit_pct) : '',
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

export default function AccountsModule() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TradingAccountType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TradingAccountStatus>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormState>(DEFAULT_FORM);

  useEffect(() => {
    void loadAccounts();
  }, []);

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
    return accounts.filter((account) => {
      const matchesQuery =
        !query ||
        account.name.toLowerCase().includes(query.toLowerCase()) ||
        (account.alias ?? '').toLowerCase().includes(query.toLowerCase()) ||
        account.broker_name.toLowerCase().includes(query.toLowerCase());

      const matchesType = typeFilter === 'all' || account.account_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || account.status === statusFilter;

      return matchesQuery && matchesType && matchesStatus;
    });
  }, [accounts, query, typeFilter, statusFilter]);

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
          <option value="real">Real</option>
          <option value="demo">Demo</option>
          <option value="funded">Fondeo</option>
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

      {loading ? (
        <p className="accounts-loading">Cargando cuentas...</p>
      ) : filteredAccounts.length === 0 ? (
        <p className="accounts-empty">Aun no tienes cuentas registradas.</p>
      ) : (
        <div className="accounts-grid">
          {filteredAccounts.map((account) => (
            <article key={account.id} className="account-card">
              <h3>{account.name}</h3>
              <p><strong>Alias:</strong> {account.alias || '-'}</p>
              <p><strong>Broker/Firma:</strong> {account.broker_name}</p>
              <p><strong>Tipo:</strong> {account.account_type.toUpperCase()}</p>
              <p><strong>Plataforma:</strong> {account.platform.toUpperCase()}</p>
              <p><strong>Estado:</strong> {account.status === 'active' ? 'ACTIVA' : 'INACTIVA'}</p>
              <p><strong>Balance:</strong> {account.initial_balance.toLocaleString()} {account.base_currency}</p>
              <p><strong>Riesgo/Trade:</strong> {account.risk_per_trade_pct ?? '-'}%</p>

              <div className="account-card-actions">
                <button type="button" className="secondary-btn" onClick={() => openEditModal(account)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => void handleToggleStatus(account)}
                >
                  {account.status === 'active' ? 'Inactivar' : 'Activar'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="accounts-modal-overlay" role="dialog" aria-modal="true" aria-label="Formulario cuenta">
          <div className="accounts-modal">
            <h2>{modalMode === 'create' ? 'Crear cuenta' : 'Editar cuenta'}</h2>

            <form className="accounts-form" onSubmit={handleSaveAccount}>
              <label>
                Nombre de la cuenta *
                <input
                  value={form.name}
                  onChange={(event) => handleFormChange('name', event.target.value)}
                  required
                />
              </label>

              <label>
                Alias
                <input
                  value={form.alias}
                  onChange={(event) => handleFormChange('alias', event.target.value)}
                />
              </label>

              <label>
                Broker/Firma *
                <input
                  value={form.broker_name}
                  onChange={(event) => handleFormChange('broker_name', event.target.value)}
                  required
                />
              </label>

              <label>
                Tipo de cuenta *
                <select
                  value={form.account_type}
                  onChange={(event) => handleFormChange('account_type', event.target.value as TradingAccountType)}
                >
                  <option value="real">Real</option>
                  <option value="demo">Demo</option>
                  <option value="funded">Fondeo</option>
                </select>
              </label>

              <label>
                Plataforma *
                <select
                  value={form.platform}
                  onChange={(event) =>
                    handleFormChange('platform', event.target.value as 'mt4' | 'mt5' | 'ctrader' | 'other')
                  }
                >
                  <option value="mt4">MT4</option>
                  <option value="mt5">MT5</option>
                  <option value="ctrader">cTrader</option>
                  <option value="other">Otro</option>
                </select>
              </label>

              <label>
                Moneda base *
                <input
                  value={form.base_currency}
                  onChange={(event) => handleFormChange('base_currency', event.target.value)}
                  required
                />
              </label>

              <label>
                Apalancamiento
                <input
                  value={form.leverage}
                  onChange={(event) => handleFormChange('leverage', event.target.value)}
                />
              </label>

              <label>
                Balance inicial *
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
                Equity inicial
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.initial_equity}
                  onChange={(event) => handleFormChange('initial_equity', event.target.value)}
                />
              </label>

              <label>
                Fecha apertura *
                <input
                  type="date"
                  value={form.opened_at}
                  onChange={(event) => handleFormChange('opened_at', event.target.value)}
                  required
                />
              </label>

              <label>
                Estado *
                <select
                  value={form.status}
                  onChange={(event) => handleFormChange('status', event.target.value as TradingAccountStatus)}
                >
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                </select>
              </label>

              <label>
                Riesgo max por operación %
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.risk_per_trade_pct}
                  onChange={(event) => handleFormChange('risk_per_trade_pct', event.target.value)}
                />
              </label>

              <label>
                Riesgo diario max %
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_daily_risk_pct}
                  onChange={(event) => handleFormChange('max_daily_risk_pct', event.target.value)}
                />
              </label>

              <label>
                Drawdown max permitido %
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
                  <label>
                    Firma de fondeo
                    <input
                      value={form.funding_firm}
                      onChange={(event) => handleFormChange('funding_firm', event.target.value)}
                    />
                  </label>

                  <label>
                    Fase desafío
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
                    Target beneficio %
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.profit_target_pct}
                      onChange={(event) => handleFormChange('profit_target_pct', event.target.value)}
                    />
                  </label>

                  <label>
                    Límite pérdida diaria %
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.daily_loss_limit_pct}
                      onChange={(event) => handleFormChange('daily_loss_limit_pct', event.target.value)}
                    />
                  </label>

                  <label>
                    Límite pérdida total %
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.max_loss_limit_pct}
                      onChange={(event) => handleFormChange('max_loss_limit_pct', event.target.value)}
                    />
                  </label>

                  <label>
                    Ciclo de pago
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
                Observaciones
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
        </div>
      )}
    </section>
  );
}
