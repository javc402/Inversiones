import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon } from './AppIcon';
import { listTradingAccounts, TradingAccount } from '@services/accounts';
import {
  createMarketEntriesForAccounts,
  deleteMarketEntryById,
  listMarketEntriesByUser,
  MarketEntry,
  MarketEntryDirection,
  MarketEntryStatus,
  seedMarketEntries,
  updateMarketEntryById,
} from '@services/market-entries';
import { logAuditActivity } from '@services/audit';
import '../styles/market-entries-module.css';

type AuditTargetTypeWithSystem = 'account' | 'user' | 'config' | 'system';

type ModalMode = 'create' | 'edit';

type AccountRowForm = {
  accountId: string;
  riskAmount: string;
  investmentPercent: string;
};

interface MarketEntriesModuleProps {
  userEmail: string;
}

interface EntryCommonForm {
  symbol: string;
  marketContext: string;
  setup: string;
  session: string;
  direction: MarketEntryDirection;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  note: string;
  plannedAt: string;
  status: MarketEntryStatus;
}

interface EditForm {
  status: MarketEntryStatus;
  riskAmount: string;
  investmentPercent: string;
  resultR: string;
  note: string;
}

const defaultCommonForm: EntryCommonForm = {
  symbol: '',
  marketContext: '',
  setup: '',
  session: 'NEW YORK',
  direction: 'buy',
  entryPrice: '',
  stopLoss: '',
  takeProfit: '',
  note: '',
  plannedAt: new Date().toISOString().slice(0, 16),
  status: 'planned',
};

const defaultEditForm: EditForm = {
  status: 'planned',
  riskAmount: '',
  investmentPercent: '',
  resultR: '',
  note: '',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusLabel(status: MarketEntryStatus): string {
  if (status === 'planned') return 'Planificada';
  if (status === 'open') return 'Abierta';
  if (status === 'closed') return 'Cerrada';
  return 'Cancelada';
}

function directionLabel(direction: MarketEntryDirection): string {
  return direction === 'buy' ? 'BUY' : 'SELL';
}

function toNumber(value: string): number {
  return Number(value.trim());
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number(trimmed);
}

function buildDefaultAccountRows(accounts: TradingAccount[]): AccountRowForm[] {
  if (accounts.length === 0) {
    return [{ accountId: '', riskAmount: '', investmentPercent: '' }];
  }

  return [
    {
      accountId: accounts[0].id,
      riskAmount: '',
      investmentPercent: '',
    },
  ];
}

function EntryFieldLabel({ text, help }: Readonly<{ text: string; help: string }>) {
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
    <span className="entries-field-label">
      {text}
      <button
        type="button"
        className="entries-help-trigger"
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
            className="entries-help-popover is-open"
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

function EntryCard({ entry, groupSize, onEdit, onDelete }: Readonly<{
  entry: MarketEntry;
  groupSize: number;
  onEdit: (entry: MarketEntry) => void;
  onDelete: (entry: MarketEntry) => void;
}>) {
  const isGroupedEntry = groupSize > 1;

  return (
    <article className="entries-card">
      <header className="entries-card-header">
        <div>
          <p className="entries-card-account">{entry.accountName}</p>
          <h3>{entry.symbol} · {directionLabel(entry.direction)}</h3>
          {isGroupedEntry && (
            <span className="entries-group-badge">Grupo · {groupSize} cuentas</span>
          )}
        </div>
        <span className={`entries-status entries-status-${entry.status}`}>{statusLabel(entry.status)}</span>
      </header>

      <div className="entries-grid-meta">
        <p><strong>Contexto:</strong> {entry.marketContext}</p>
        <p><strong>Setup:</strong> {entry.setup}</p>
        <p><strong>Sesion:</strong> {entry.session}</p>
        <p><strong>Fecha plan:</strong> {formatDate(entry.plannedAt)}</p>
      </div>

      <div className="entries-prices-row">
        <span>Entrada: {entry.entryPrice}</span>
        <span>SL: {entry.stopLoss}</span>
        <span>TP: {entry.takeProfit}</span>
      </div>

      <div className="entries-risk-row">
        <span>Riesgo cuenta: ${entry.riskAmount.toFixed(2)}</span>
        <span>% inversion: {entry.investmentPercent.toFixed(2)}%</span>
        <span>Resultado R: {entry.resultR === null ? 'N/A' : entry.resultR.toFixed(2)}</span>
      </div>

      <p className="entries-note">{entry.note || 'Sin notas.'}</p>

      <footer className="entries-card-actions">
        <button
          type="button"
          className="entries-action-btn entries-action-btn-icon"
          onClick={() => onEdit(entry)}
          aria-label="Editar entrada"
          title="Editar entrada"
        >
          <AppIcon name="edit" />
        </button>
        <button
          type="button"
          className="entries-action-btn entries-action-btn-danger entries-action-btn-icon"
          onClick={() => onDelete(entry)}
          aria-label="Eliminar entrada"
          title="Eliminar entrada"
        >
          <AppIcon name="delete" />
        </button>
      </footer>
    </article>
  );
}

export default function MarketEntriesModule({ userEmail }: Readonly<MarketEntriesModuleProps>) {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [entries, setEntries] = useState<MarketEntry[]>([]);
  const [accountFilter, setAccountFilter] = useState<'all' | string>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editingEntry, setEditingEntry] = useState<MarketEntry | null>(null);

  const [commonForm, setCommonForm] = useState<EntryCommonForm>(defaultCommonForm);
  const [perAccountRows, setPerAccountRows] = useState<AccountRowForm[]>([{ accountId: '', riskAmount: '', investmentPercent: '' }]);
  const [editForm, setEditForm] = useState<EditForm>(defaultEditForm);
  const [applyCommonToGroup, setApplyCommonToGroup] = useState(false);

  async function loadData() {
    const loadedAccounts = await listTradingAccounts();
    setAccounts(loadedAccounts);
    seedMarketEntries(userEmail, loadedAccounts);
    setEntries(listMarketEntriesByUser(userEmail));

    if (perAccountRows.length === 1 && !perAccountRows[0].accountId) {
      setPerAccountRows(buildDefaultAccountRows(loadedAccounts));
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesAccount = accountFilter === 'all' || entry.accountId === accountFilter;
      const term = query.trim().toLowerCase();
      const matchesQuery =
        !term ||
        entry.symbol.toLowerCase().includes(term) ||
        entry.marketContext.toLowerCase().includes(term) ||
        entry.accountName.toLowerCase().includes(term);

      return matchesAccount && matchesQuery;
    });
  }, [entries, accountFilter, query]);

  const totalRisk = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => sum + entry.riskAmount, 0);
  }, [filteredEntries]);

  const groupSizes = useMemo(() => {
    const counts = new Map<string, number>();

    for (const entry of entries) {
      counts.set(entry.groupId, (counts.get(entry.groupId) ?? 0) + 1);
    }

    return counts;
  }, [entries]);

  function openCreateModal() {
    setModalMode('create');
    setEditingEntry(null);
    setCommonForm(defaultCommonForm);
    setPerAccountRows(buildDefaultAccountRows(accounts));
    setEditForm(defaultEditForm);
    setApplyCommonToGroup(false);
    setError('');
    setSuccess('');
  }

  function openEditModal(entry: MarketEntry) {
    setModalMode('edit');
    setEditingEntry(entry);
    setEditForm({
      status: entry.status,
      riskAmount: String(entry.riskAmount),
      investmentPercent: String(entry.investmentPercent),
      resultR: entry.resultR === null ? '' : String(entry.resultR),
      note: entry.note,
    });
    setApplyCommonToGroup(false);
    setError('');
    setSuccess('');
  }

  function closeModal() {
    setModalMode(null);
    setEditingEntry(null);
    setApplyCommonToGroup(false);
    setError('');
  }

  function addAccountRow() {
    setPerAccountRows((prev) => [...prev, { accountId: '', riskAmount: '', investmentPercent: '' }]);
  }

  function removeAccountRow(index: number) {
    setPerAccountRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  function updateAccountRow(index: number, patch: Partial<AccountRowForm>) {
    setPerAccountRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  async function handleCreateSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    try {
      const accountIds = new Set<string>();
      const perAccount = perAccountRows.map((row, index) => {
        const account = accounts.find((item) => item.id === row.accountId);
        if (!account) {
          throw new Error(`Selecciona una cuenta valida en la fila ${index + 1}.`);
        }

        if (accountIds.has(account.id)) {
          throw new Error(`La cuenta ${account.alias || account.name} esta repetida.`);
        }

        accountIds.add(account.id);

        return {
          accountId: account.id,
          accountName: account.alias || account.name,
          riskAmount: toNumber(row.riskAmount),
          investmentPercent: toNumber(row.investmentPercent),
        };
      });

      const created = createMarketEntriesForAccounts(userEmail, {
        common: {
          symbol: commonForm.symbol,
          marketContext: commonForm.marketContext,
          setup: commonForm.setup,
          session: commonForm.session,
          direction: commonForm.direction,
          entryPrice: toNumber(commonForm.entryPrice),
          stopLoss: toNumber(commonForm.stopLoss),
          takeProfit: toNumber(commonForm.takeProfit),
          note: commonForm.note,
          plannedAt: commonForm.plannedAt,
          status: commonForm.status,
        },
        perAccount,
      });

      setEntries(listMarketEntriesByUser(userEmail));
      setSuccess(`Entrada creada en ${created.length} cuenta(s).`);

      void logAuditActivity('market_entries.create_batch', {
        module: 'market_entries',
        targetType: 'system' as AuditTargetTypeWithSystem,
        source: 'frontend',
        symbol: commonForm.symbol,
        accountsCount: perAccount.length,
        accountIds: perAccount.map((item) => item.accountId),
        riskByAccount: perAccount.map((item) => ({ accountId: item.accountId, riskAmount: item.riskAmount, investmentPercent: item.investmentPercent })),
      });

      closeModal();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar la entrada.');
    }
  }

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editingEntry) return;

    setError('');

    try {
      const result = updateMarketEntryById(userEmail, editingEntry.id, {
        status: editForm.status,
        riskAmount: toNumber(editForm.riskAmount),
        investmentPercent: toNumber(editForm.investmentPercent),
        resultR: toNumberOrNull(editForm.resultR),
        note: editForm.note,
      }, {
        applyCommonToGroup,
      });

      setEntries(listMarketEntriesByUser(userEmail));
      setSuccess(
        result.groupApplied
          ? `Cambios comunes aplicados a ${result.affectedEntries} registro(s) del grupo. Riesgo y % quedaron por cuenta.`
          : `Entrada actualizada para ${result.updatedEntry.accountName}.`
      );

      void logAuditActivity('market_entries.update', {
        module: 'market_entries',
        targetType: 'system' as AuditTargetTypeWithSystem,
        source: 'frontend',
        targetId: result.updatedEntry.id,
        accountId: result.updatedEntry.accountId,
        groupApplied: result.groupApplied,
        affectedEntries: result.affectedEntries,
        fieldsChanged: result.groupApplied
          ? ['status', 'note', 'riskAmount', 'investmentPercent', 'resultR']
          : ['status', 'riskAmount', 'investmentPercent', 'resultR', 'note'],
      });

      closeModal();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo actualizar la entrada.');
    }
  }

  function handleDelete(entry: MarketEntry) {
    if (!window.confirm(`Eliminar entrada de ${entry.accountName} para ${entry.symbol}?`)) return;

    try {
      deleteMarketEntryById(userEmail, entry.id);
      setEntries(listMarketEntriesByUser(userEmail));
      setSuccess('Entrada eliminada.');

      void logAuditActivity('market_entries.delete', {
        module: 'market_entries',
        targetType: 'system' as AuditTargetTypeWithSystem,
        source: 'frontend',
        targetId: entry.id,
        accountId: entry.accountId,
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la entrada.');
    }
  }

  const modal = modalMode
    ? createPortal(
        <div className="entries-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="entries-modal-title">
          <div className="entries-modal-shell">
            <div className="entries-modal-header">
              <div>
                <p className="entries-modal-kicker">Registro operativo</p>
                <h2 id="entries-modal-title">{modalMode === 'create' ? 'Nueva entrada al mercado' : 'Editar entrada por cuenta'}</h2>
              </div>
              <button type="button" className="entries-modal-close" onClick={closeModal}>
                <AppIcon name="delete" />
              </button>
            </div>

            {modalMode === 'create' ? (
              <form className="entries-form" onSubmit={handleCreateSubmit}>
                <label>
                  <EntryFieldLabel text="Simbolo" help="Par de mercado o activo sobre el que vas a registrar la entrada." />
                  <input value={commonForm.symbol} onChange={(event) => setCommonForm((prev) => ({ ...prev, symbol: event.target.value }))} placeholder="EURUSD" required />
                </label>

                <label>
                  <EntryFieldLabel text="Direccion" help="Sentido de la operación: BUY para largos o SELL para cortos." />
                  <select value={commonForm.direction} onChange={(event) => setCommonForm((prev) => ({ ...prev, direction: event.target.value as MarketEntryDirection }))}>
                    <option value="buy">BUY</option>
                    <option value="sell">SELL</option>
                  </select>
                </label>

                <label className="entries-form-span-2">
                  <EntryFieldLabel text="Contexto / Noticia" help="Evento o contexto que respalda la hipótesis de entrada." />
                  <input value={commonForm.marketContext} onChange={(event) => setCommonForm((prev) => ({ ...prev, marketContext: event.target.value }))} placeholder="CPI, FOMC, PRE market..." required />
                </label>

                <label>
                  <EntryFieldLabel text="Setup" help="Patrón o estructura técnica que define la ejecución." />
                  <input value={commonForm.setup} onChange={(event) => setCommonForm((prev) => ({ ...prev, setup: event.target.value }))} required />
                </label>

                <label>
                  <EntryFieldLabel text="Sesion" help="Bloque horario de mercado donde se planifica la operación." />
                  <input value={commonForm.session} onChange={(event) => setCommonForm((prev) => ({ ...prev, session: event.target.value }))} required />
                </label>

                <label>
                  <EntryFieldLabel text="Entrada" help="Precio objetivo para ejecutar la entrada." />
                  <input type="number" step="0.0001" value={commonForm.entryPrice} onChange={(event) => setCommonForm((prev) => ({ ...prev, entryPrice: event.target.value }))} required />
                </label>

                <label>
                  <EntryFieldLabel text="Stop Loss" help="Nivel de invalidación de la idea para limitar pérdida." />
                  <input type="number" step="0.0001" value={commonForm.stopLoss} onChange={(event) => setCommonForm((prev) => ({ ...prev, stopLoss: event.target.value }))} required />
                </label>

                <label>
                  <EntryFieldLabel text="Take Profit" help="Objetivo de salida con beneficio para la operación." />
                  <input type="number" step="0.0001" value={commonForm.takeProfit} onChange={(event) => setCommonForm((prev) => ({ ...prev, takeProfit: event.target.value }))} required />
                </label>

                <label>
                  <EntryFieldLabel text="Fecha/hora" help="Momento planificado para ejecutar o evaluar la entrada." />
                  <input type="datetime-local" value={commonForm.plannedAt} onChange={(event) => setCommonForm((prev) => ({ ...prev, plannedAt: event.target.value }))} required />
                </label>

                <label>
                  <EntryFieldLabel text="Estado inicial" help="Estado con el que se crea la entrada en el flujo operativo." />
                  <select value={commonForm.status} onChange={(event) => setCommonForm((prev) => ({ ...prev, status: event.target.value as MarketEntryStatus }))}>
                    <option value="planned">Planificada</option>
                    <option value="open">Abierta</option>
                  </select>
                </label>

                <label className="entries-form-span-2">
                  <EntryFieldLabel text="Notas" help="Observaciones tácticas para seguimiento y revisión posterior." />
                  <textarea value={commonForm.note} onChange={(event) => setCommonForm((prev) => ({ ...prev, note: event.target.value }))} rows={3} />
                </label>

                <div className="entries-accounts-editor entries-form-span-2">
                  <div className="entries-accounts-title-row">
                    <h3>Cuentas asociadas</h3>
                    <button type="button" className="entries-inline-btn" onClick={addAccountRow}>
                      <AppIcon name="check" />
                      Agregar cuenta
                    </button>
                  </div>

                  <div className="entries-accounts-table">
                    <div className="entries-accounts-head">
                      <span>Cuenta</span>
                      <span>Riesgo ($)</span>
                      <span>% inversion</span>
                      <span>Accion</span>
                    </div>

                    {perAccountRows.map((row, index) => (
                      <div className="entries-accounts-row" key={`row-${index}`}>
                        <select value={row.accountId} onChange={(event) => updateAccountRow(index, { accountId: event.target.value })} required>
                          <option value="">Selecciona cuenta</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.alias || account.name}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.riskAmount}
                          onChange={(event) => updateAccountRow(index, { riskAmount: event.target.value })}
                          required
                        />

                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.investmentPercent}
                          onChange={(event) => updateAccountRow(index, { investmentPercent: event.target.value })}
                          required
                        />

                        <button type="button" className="entries-inline-btn entries-inline-btn-danger" onClick={() => removeAccountRow(index)} disabled={perAccountRows.length <= 1}>
                          <AppIcon name="delete" />
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>

                  <p className="entries-accounts-summary">Se crearan {perAccountRows.length} registro(s), uno por cuenta.</p>
                </div>

                {error && <p className="entries-form-error">{error}</p>}

                <div className="entries-form-actions entries-form-span-2">
                  <button type="button" className="secondary-btn" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="primary-btn">Guardar entradas</button>
                </div>
              </form>
            ) : (
              <form className="entries-form" onSubmit={handleEditSubmit}>
                <label>
                  <EntryFieldLabel text="Cuenta" help="Cuenta concreta sobre la que estás editando este registro." />
                  <input value={editingEntry?.accountName ?? ''} disabled />
                </label>

                <label>
                  <EntryFieldLabel text="Simbolo" help="Activo asociado a la entrada; en edición se muestra como referencia." />
                  <input value={editingEntry?.symbol ?? ''} disabled />
                </label>

                <label>
                  <EntryFieldLabel text="Estado" help="Fase operativa actual de la entrada para control del ciclo." />
                  <select value={editForm.status} onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value as MarketEntryStatus }))}>
                    <option value="planned">Planificada</option>
                    <option value="open">Abierta</option>
                    <option value="closed">Cerrada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </label>

                <label>
                  <EntryFieldLabel text="Riesgo ($)" help="Capital que se arriesga en esta cuenta para la entrada." />
                  <input type="number" step="0.01" min="0" value={editForm.riskAmount} onChange={(event) => setEditForm((prev) => ({ ...prev, riskAmount: event.target.value }))} required />
                </label>

                <label>
                  <EntryFieldLabel text="% inversion" help="Porcentaje del capital asignado a esta cuenta para la entrada." />
                  <input type="number" step="0.01" min="0" value={editForm.investmentPercent} onChange={(event) => setEditForm((prev) => ({ ...prev, investmentPercent: event.target.value }))} required />
                </label>

                <label>
                  <EntryFieldLabel text="Resultado R" help="Resultado medido en múltiplos de riesgo; opcional hasta cierre." />
                  <input type="number" step="0.01" value={editForm.resultR} onChange={(event) => setEditForm((prev) => ({ ...prev, resultR: event.target.value }))} placeholder="Opcional" />
                </label>

                <label className="entries-form-span-2">
                  <EntryFieldLabel text="Notas" help="Comentario operativo de seguimiento y cierre para la entrada." />
                  <textarea value={editForm.note} onChange={(event) => setEditForm((prev) => ({ ...prev, note: event.target.value }))} rows={3} />
                </label>

                <label className="entries-group-toggle entries-form-span-2">
                  <input
                    type="checkbox"
                    checked={applyCommonToGroup}
                    onChange={(event) => setApplyCommonToGroup(event.target.checked)}
                  />
                  <span>Aplicar estado y nota a todas las cuentas del grupo</span>
                </label>

                {error && <p className="entries-form-error">{error}</p>}

                <div className="entries-form-actions entries-form-span-2">
                  <button type="button" className="secondary-btn" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="primary-btn">Guardar cambios</button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <section className="entries-module">
      <header className="entries-hero">
        <div>
          <p className="entries-hero-kicker">Operacion multi-cuenta</p>
          <h2>Entradas al mercado</h2>
          <p>Una entrada puede asociarse a varias cuentas, guardando un registro independiente con su riesgo y % de inversion por cuenta.</p>
        </div>
        <button type="button" className="primary-btn entries-create-btn" onClick={openCreateModal} disabled={accounts.length === 0}>
          <AppIcon name="edit" />
          Nueva entrada
        </button>
      </header>

      <div className="entries-toolbar">
        <input className="entries-search" placeholder="Buscar por simbolo, contexto o cuenta" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="entries-filter" value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
          <option value="all">Todas las cuentas</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>{account.alias || account.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="entries-alert entries-alert-error">{error}</p>}
      {success && <p className="entries-alert entries-alert-success">{success}</p>}

      <section className="entries-kpis">
        <article className="entries-kpi-card">
          <p>Registros visibles</p>
          <strong>{filteredEntries.length}</strong>
        </article>
        <article className="entries-kpi-card">
          <p>Riesgo total visible</p>
          <strong>${totalRisk.toFixed(2)}</strong>
        </article>
        <article className="entries-kpi-card">
          <p>Cuentas activas</p>
          <strong>{new Set(filteredEntries.map((entry) => entry.accountId)).size}</strong>
        </article>
      </section>

      {accounts.length === 0 ? (
        <section className="entries-empty">
          <h3>No hay cuentas disponibles</h3>
          <p>Crea al menos una cuenta en el modulo de cuentas para registrar entradas multi-cuenta.</p>
        </section>
      ) : filteredEntries.length === 0 ? (
        <section className="entries-empty">
          <h3>No hay entradas registradas</h3>
          <p>Empieza creando tu primera entrada y asociandola a una o varias cuentas.</p>
        </section>
      ) : (
        <div className="entries-grid">
          {filteredEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              groupSize={groupSizes.get(entry.groupId) ?? 1}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {modal}
    </section>
  );
}
