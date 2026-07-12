import { type Dispatch, FormEvent, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon } from './AppIcon';
import { listTradingAccounts, TradingAccount } from '@services/accounts';
import {
  CandleProtocol,
  CreateMarketEntriesInput,
  createMarketEntriesForAccounts,
  deleteMarketEntryById,
  listMarketEntriesByUser,
  listMostUsedMarketContexts,
  MarketContextSource,
  MarketEntry,
  MarketEntryDirection,
  MarketNewsImpact,
  MarketEntryStatus,
  updateMarketEntryById,
} from '../services/market-entries';
import { listUserNews, NewsArticle } from '@services/news';
import { logAuditActivity } from '@services/audit';
import { openDatePicker, preventManualDatePasteOrDrop, preventManualDateTyping } from '@lib/dateInputGuards';
import '../styles/market-entries-module.css';

type AuditTargetTypeWithSystem = 'account' | 'user' | 'config' | 'system';

type ModalMode = 'create' | 'edit';

type AccountRowForm = {
  id: string;
  accountId: string;
  riskAmount: string;
};

export function createAccountRow(accountId = ''): AccountRowForm {
  const cryptoApi = globalThis.crypto;
  return {
    id: cryptoApi?.randomUUID?.() ?? `account-row-${Date.now()}`,
    accountId,
    riskAmount: '',
  };
}

interface MarketEntriesModuleProps {
  userEmail: string;
}

interface EntryCommonForm {
  symbol: string;
  symbolDetail: string;
  marketContext: string;
  contextSource: MarketContextSource;
  newsArticleId: string;
  newsImpact: MarketNewsImpact | '';
  setup: string;
  session: string;
  candleProtocol: CandleProtocol;
  direction: MarketEntryDirection;
  resultR: string;
  operationLink: string;
  noEntryReason: string;
  note: string;
  plannedAt: string;
  status: MarketEntryStatus;
}

interface EditForm {
  status: MarketEntryStatus;
  marketContext: string;
  plannedAt: string;
  accountId: string;
  accountName: string;
  direction: MarketEntryDirection | '';
  riskAmount: string;
  resultR: string;
  operationLink: string;
  noEntryReason: string;
  note: string;
}

const COMMON_SYMBOL_OPTIONS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NAS100', 'US30', 'NZDUSD', 'AUDUSD', 'USDCHF', 'USDCAD', 'OTRO'] as const;

const defaultCommonForm: EntryCommonForm = {
  symbol: '',
  symbolDetail: '',
  marketContext: '',
  contextSource: 'free_text',
  newsArticleId: '',
  newsImpact: '',
  setup: '',
  session: 'NEW YORK',
  candleProtocol: 'no',
  direction: 'buy',
  resultR: '0.0',
  operationLink: '',
  noEntryReason: '',
  note: '',
  plannedAt: new Date().toISOString().slice(0, 16),
  status: 'closed',
};

const defaultEditForm: EditForm = {
  status: 'closed',
  marketContext: '',
  plannedAt: new Date().toISOString().slice(0, 16),
  accountId: '',
  accountName: '',
  direction: '',
  riskAmount: '',
  resultR: '0.0',
  operationLink: '',
  noEntryReason: '',
  note: '',
};

function normalizeEditableEntryStatus(status: MarketEntryStatus): MarketEntryStatus {
  return status === 'no_entry' ? 'no_entry' : 'closed';
}

function toDateTimeLocalValue(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 16);
  }

  return parsed.toISOString().slice(0, 16);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function statusLabel(status: MarketEntryStatus): string {
  if (status === 'planned') return 'Planificada';
  if (status === 'open') return 'Abierta';
  if (status === 'closed') return 'Completada';
  if (status === 'no_entry') return 'Sin entrada';
  return 'Cancelada';
}

export function directionLabel(direction: MarketEntryDirection): string {
  return direction === 'buy' ? 'BUY' : 'SELL';
}

type TechnicalOutcome = 'tp_partial' | 'tp_1_1' | 'tp_extended' | 'sl' | 'flat';
type FinancialOutcome = 'profit' | 'loss' | 'breakeven';

export function resolveTechnicalOutcome(entry: MarketEntry): TechnicalOutcome | null {
  if (entry.status !== 'closed' || entry.resultR === null) {
    return null;
  }

  if (entry.resultR < 0) return 'sl';
  if (entry.resultR === 0) return 'flat';
  if (entry.resultR === 1) return 'tp_1_1';
  if (entry.resultR > 1) return 'tp_extended';
  return 'tp_partial';
}

export function technicalOutcomeLabel(outcome: TechnicalOutcome): string {
  if (outcome === 'sl') return 'SL';
  if (outcome === 'flat') return 'Sin avance';
  if (outcome === 'tp_1_1') return 'Break tecnico 1:1';
  if (outcome === 'tp_extended') return 'TP extendido';
  return 'TP parcial';
}

export function resolveFinancialOutcome(entry: MarketEntry): FinancialOutcome | null {
  if (entry.status !== 'closed' || entry.resultR === null) {
    return null;
  }

  if (entry.resultR < 0) return 'loss';
  if (entry.resultR > 0) return 'profit';
  return 'breakeven';
}

export function financialOutcomeLabel(outcome: FinancialOutcome): string {
  if (outcome === 'profit') return 'Ganancia';
  if (outcome === 'loss') return 'Perdida';
  return 'Breakeven';
}

// Compatibilidad para helpers ya exportados en tests y utilidades.
export function resolveEntryOutcome(entry: MarketEntry): TechnicalOutcome | null {
  return resolveTechnicalOutcome(entry);
}

export function outcomeLabel(outcome: TechnicalOutcome): string {
  return technicalOutcomeLabel(outcome);
}

export function toNumber(value: string): number {
  return Number(value.trim());
}

export function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number(trimmed);
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const value = error as { message?: unknown; details?: unknown; hint?: unknown };
    if (typeof value.message === 'string' && value.message.trim()) {
      const details = typeof value.details === 'string' && value.details.trim() ? ` Detalle: ${value.details}` : '';
      const hint = typeof value.hint === 'string' && value.hint.trim() ? ` Sugerencia: ${value.hint}` : '';
      return `${value.message}${details}${hint}`.trim();
    }
  }

  return fallback;
}

export function normalizeResultR(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

export function calculateAccountResultAmount(riskAmount: number, resultR: number | null): number | null {
  if (!Number.isFinite(riskAmount) || riskAmount <= 0 || resultR === null || !Number.isFinite(resultR)) {
    return null;
  }

  return riskAmount * resultR;
}

export function resolveEntrySymbol(entry: Pick<MarketEntry, 'symbol' | 'symbolDetail'>): string {
  if (entry.symbol === 'OTRO') {
    return entry.symbolDetail?.trim() || 'OTRO';
  }

  return entry.symbol;
}

export function candleProtocolLabel(protocol: CandleProtocol | null): string {
  if (protocol === 'ob') return 'OB';
  if (protocol === 'fvg') return 'FVG';
  return 'NO';
}

export function newsImpactLabel(impact: MarketNewsImpact | null): string {
  if (impact === 'high') return 'Alto';
  if (impact === 'medium') return 'Medio';
  if (impact === 'low') return 'Bajo';
  return 'Sin impacto';
}

export function entryDeletionLabel(entry: MarketEntry): string {
  if (entry.status !== 'no_entry') {
    return `entrada de ${entry.accountName} para ${entry.symbol}`;
  }

  if (!entry.symbol) {
    return 'registro sin entrada';
  }

  return `registro sin entrada de ${entry.symbol}`;
}

export function buildCreatePerAccountSelection(
  accounts: TradingAccount[],
  perAccountRows: AccountRowForm[],
  _isNoEntryOnCreate: boolean
) {
  const accountIds = new Set<string>();
  return perAccountRows.map((row, index) => {
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
      investmentPercent: 1,
    };
  });
}

export function buildCreateMarketEntryRequest(
  commonForm: EntryCommonForm,
  perAccount: ReturnType<typeof buildCreatePerAccountSelection>,
  isNoEntryOnCreate: boolean,
  isCompletedOnCreate: boolean
) {
  const resultRValue = isCompletedOnCreate && !isNoEntryOnCreate
    ? normalizeResultR(toNumber(commonForm.resultR))
    : null;

  if (isCompletedOnCreate && resultRValue === null) {
    throw new Error('No se pudo interpretar el Resultado R ingresado.');
  }

  return {
    createInput: {
      common: {
        symbol: commonForm.symbol,
        symbolDetail: commonForm.symbol === 'OTRO' ? commonForm.symbolDetail : null,
        marketContext: commonForm.marketContext,
        contextSource: commonForm.contextSource,
        newsArticleId: commonForm.contextSource === 'news' ? commonForm.newsArticleId : null,
        newsImpact: commonForm.contextSource === 'news' ? (commonForm.newsImpact || null) : null,
        setup: commonForm.setup,
        session: commonForm.session,
        candleProtocol: commonForm.candleProtocol,
        direction: isNoEntryOnCreate ? undefined : commonForm.direction,
        operationLink: commonForm.operationLink,
        resultR: isCompletedOnCreate ? resultRValue : null,
        noEntryReason: isNoEntryOnCreate ? commonForm.marketContext : undefined,
        note: commonForm.note,
        plannedAt: commonForm.plannedAt,
        status: commonForm.status,
      },
      perAccount,
    } satisfies CreateMarketEntriesInput,
    resultRValue,
  };
}

export function buildDefaultAccountRows(accounts: TradingAccount[]): AccountRowForm[] {
  if (accounts.length === 0) {
    return [createAccountRow()];
  }

  return [createAccountRow(accounts[0].id)];
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
  const isNoEntry = entry.status === 'no_entry';
  const accountResult = calculateAccountResultAmount(entry.riskAmount, entry.resultR);
  const technicalOutcome = resolveTechnicalOutcome(entry);
  const financialOutcome = resolveFinancialOutcome(entry);
  const entrySymbol = resolveEntrySymbol(entry);

  return (
    <article className="entries-card">
      <header className="entries-card-header">
        <div>
          <p className="entries-card-account">{entry.accountName || 'Sin cuenta asociada'}</p>
          <h3>{isNoEntry ? (entrySymbol || 'Sin entrada al mercado') : `${entrySymbol} · ${directionLabel(entry.direction)}`}</h3>
          {isGroupedEntry && (
            <span className="entries-group-badge">Grupo · {groupSize} cuentas</span>
          )}
        </div>
        <div className="entries-status-stack">
          <span className={`entries-status entries-status-${entry.status}`}>{statusLabel(entry.status)}</span>
          {technicalOutcome && (
            <span className={`entries-outcome-badge entries-outcome-${technicalOutcome}`}>
              Tecnico: {technicalOutcomeLabel(technicalOutcome)}
            </span>
          )}
          {financialOutcome && (
            <span className={`entries-outcome-badge entries-outcome-financial entries-outcome-financial-${financialOutcome}`}>
              Financiero: {financialOutcomeLabel(financialOutcome)}
            </span>
          )}
        </div>
      </header>

      <div className="entries-grid-meta">
        <p><strong>Contexto:</strong> {entry.marketContext}</p>
        {entry.newsArticleId && <p><strong>Impacto noticia:</strong> {newsImpactLabel(entry.newsImpact)}</p>}
        <p><strong>Setup/Estrategia:</strong> {entry.setup}</p>
        <p><strong>Protocolo vela:</strong> {candleProtocolLabel(entry.candleProtocol)}</p>
        <p><strong>Sesion:</strong> {entry.session}</p>
        <p><strong>Fecha de ejecucion:</strong> {formatDate(entry.plannedAt)}</p>
        {entry.operationLink && (
          <p>
            <strong>Link operación:</strong>{' '}
            <a href={entry.operationLink} target="_blank" rel="noreferrer">Abrir enlace</a>
          </p>
        )}
        {isNoEntry && <p><strong>Motivo sin entrada:</strong> {entry.noEntryReason || 'Sin detalle'}</p>}
      </div>

      {!isNoEntry && (
        <div className="entries-risk-row">
          <span>Riesgo cuenta: ${entry.riskAmount.toFixed(2)}</span>
          <span>% inversion: {entry.investmentPercent.toFixed(2)}%</span>
          <span>Resultado R: {entry.resultR === null ? 'N/A' : entry.resultR.toFixed(1)}</span>
          <span>Resultado cuenta: {accountResult === null ? 'N/A' : `$${accountResult.toFixed(2)}`}</span>
        </div>
      )}

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

interface MarketEntriesCreateFormProps {
  commonForm: EntryCommonForm;
  setCommonForm: Dispatch<SetStateAction<EntryCommonForm>>;
  isNoEntryOnCreate: boolean;
  isCompletedOnCreate: boolean;
  isNewsContextMode: boolean;
  newsQuery: string;
  setNewsQuery: Dispatch<SetStateAction<string>>;
  filteredNewsArticles: NewsArticle[];
  mostUsedContexts: string[];
  perAccountRows: AccountRowForm[];
  updateAccountRow: (index: number, patch: Partial<AccountRowForm>) => void;
  accounts: TradingAccount[];
  addAccountRow: () => void;
  removeAccountRow: (index: number) => void;
  canAddMoreAccounts: boolean;
  error: string;
  isSubmitting: boolean;
  closeModal: () => void;
  handleCreateSubmit: (event: FormEvent) => Promise<void>;
}

function MarketEntriesCreateForm({
  commonForm,
  setCommonForm,
  isNoEntryOnCreate,
  isCompletedOnCreate,
  isNewsContextMode,
  newsQuery,
  setNewsQuery,
  filteredNewsArticles,
  mostUsedContexts,
  perAccountRows,
  updateAccountRow,
  accounts,
  addAccountRow,
  removeAccountRow,
  canAddMoreAccounts,
  error,
  isSubmitting,
  closeModal,
  handleCreateSubmit,
}: Readonly<MarketEntriesCreateFormProps>) {
  const isOtherSymbol = commonForm.symbol === 'OTRO';

  return (
    <form className="entries-form" onSubmit={handleCreateSubmit}>
      <label>
        <EntryFieldLabel text="Simbolo" help="Par de mercado o activo sobre el que vas a registrar la entrada." />
        <select
          value={commonForm.symbol}
          onChange={(event) => setCommonForm((prev) => ({ ...prev, symbol: event.target.value, symbolDetail: event.target.value === 'OTRO' ? prev.symbolDetail : '' }))}
          required={!isNoEntryOnCreate}
          disabled={isNoEntryOnCreate}
        >
          <option value="">Selecciona símbolo</option>
          {COMMON_SYMBOL_OPTIONS.map((symbol) => (
            <option key={symbol} value={symbol}>{symbol === 'OTRO' ? 'Otro' : symbol}</option>
          ))}
        </select>
      </label>

      {isOtherSymbol && !isNoEntryOnCreate && (
        <label>
          <EntryFieldLabel text="Otro simbolo" help="Usa este campo sólo cuando el activo no esté en la lista estándar." />
          <input
            value={commonForm.symbolDetail}
            onChange={(event) => setCommonForm((prev) => ({ ...prev, symbolDetail: event.target.value.toUpperCase() }))}
            placeholder="Ej: DE40"
            required={isOtherSymbol}
          />
        </label>
      )}

      <label>
        <EntryFieldLabel text="Direccion" help="Sentido de la operación: BUY para largos o SELL para cortos." />
        <select
          value={commonForm.direction}
          onChange={(event) => setCommonForm((prev) => ({ ...prev, direction: event.target.value as MarketEntryDirection }))}
          disabled={isNoEntryOnCreate}
        >
          <option value="buy">BUY</option>
          <option value="sell">SELL</option>
        </select>
      </label>

      <div className="entries-context-editor entries-form-span-2">
        <div className="entries-context-tabs" role="tablist" aria-label="Origen del contexto">
          <button
            type="button"
            role="tab"
            aria-selected={!isNewsContextMode}
            className={`entries-context-tab ${isNewsContextMode ? '' : 'active'}`}
            onClick={() => setCommonForm((prev) => ({ ...prev, contextSource: 'free_text', newsArticleId: '' }))}
          >
            Texto libre
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isNewsContextMode}
            className={`entries-context-tab ${isNewsContextMode ? 'active' : ''}`}
            onClick={() => setCommonForm((prev) => ({ ...prev, contextSource: 'news' }))}
          >
            Noticias registradas
          </button>
        </div>

        {isNewsContextMode ? (
          <div className="entries-context-panel">
            <label>
              <EntryFieldLabel text="Buscar noticia" help="Filtra noticias creadas para reutilizarlas como contexto de entrada." />
              <input
                value={newsQuery}
                onChange={(event) => setNewsQuery(event.target.value)}
                placeholder="Buscar por titulo o categoria"
              />
            </label>

            <label>
              <EntryFieldLabel text="Noticia" help="Selecciona una noticia existente para enlazarla con esta entrada." />
              <select
                value={commonForm.newsArticleId}
                onChange={(event) => {
                  const selectedId = event.target.value;
                  const selectedNews = filteredNewsArticles.find((item) => item.id === selectedId);
                  setCommonForm((prev) => ({
                    ...prev,
                    newsArticleId: selectedId,
                    marketContext: selectedNews?.title ?? prev.marketContext,
                  }));
                }}
                required
              >
                <option value="">Selecciona noticia</option>
                {filteredNewsArticles.map((article) => (
                  <option key={article.id} value={article.id}>{article.title}</option>
                ))}
              </select>
            </label>

            <label>
              <EntryFieldLabel text="Impacto" help="Clasifica la noticia según su impacto esperado en la operación: alto, medio o bajo." />
              <select
                value={commonForm.newsImpact}
                onChange={(event) => setCommonForm((prev) => ({ ...prev, newsImpact: event.target.value as MarketNewsImpact }))}
                required
              >
                <option value="">Selecciona impacto</option>
                <option value="high">Alto</option>
                <option value="medium">Medio</option>
                <option value="low">Bajo</option>
              </select>
            </label>

            <label>
              <EntryFieldLabel text="Contexto/Noticia" help="Se completa con el titulo de la noticia seleccionada, editable si necesitas precisión adicional." />
              <input
                value={commonForm.marketContext}
                onChange={(event) => setCommonForm((prev) => ({ ...prev, marketContext: event.target.value }))}
                placeholder="Contexto asociado"
                required
              />
            </label>
          </div>
        ) : (
          <div className="entries-context-panel">
            <label>
              <EntryFieldLabel text="Contexto/Noticia" help="Evento o contexto que respalda la hipótesis de entrada." />
              <input
                value={commonForm.marketContext}
                onChange={(event) => setCommonForm((prev) => ({ ...prev, marketContext: event.target.value }))}
                placeholder="CPI, FOMC, PRE market..."
                required
              />
            </label>

            {mostUsedContexts.length > 0 && (
              <div className="entries-context-suggestions" aria-label="Contextos más usados">
                {mostUsedContexts.map((contextText) => (
                  <button
                    key={contextText}
                    type="button"
                    className="entries-context-chip"
                    onClick={() => setCommonForm((prev) => ({ ...prev, marketContext: contextText }))}
                  >
                    {contextText}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <label>
        <EntryFieldLabel text="Setup/Estrategia" help="Patrón o estrategia operativa concreta que define la ejecución." />
        <input
          value={commonForm.setup}
          onChange={(event) => setCommonForm((prev) => ({ ...prev, setup: event.target.value }))}
          required={!isNoEntryOnCreate}
          disabled={isNoEntryOnCreate}
        />
      </label>

      <label>
        <EntryFieldLabel text="Sesion" help="Bloque horario de mercado donde se planifica la operación." />
        <input
          value={commonForm.session}
          onChange={(event) => setCommonForm((prev) => ({ ...prev, session: event.target.value }))}
          required={!isNoEntryOnCreate}
          disabled={isNoEntryOnCreate}
        />
      </label>

      <label>
        <EntryFieldLabel text="Protocolo vela envolvente" help="Clasifica la validación técnica de la entrada como OB, FVG o NO." />
        <select
          value={commonForm.candleProtocol}
          onChange={(event) => setCommonForm((prev) => ({ ...prev, candleProtocol: event.target.value as CandleProtocol }))}
          disabled={isNoEntryOnCreate}
        >
          <option value="ob">OB</option>
          <option value="fvg">FVG</option>
          <option value="no">NO</option>
        </select>
      </label>

      <label>
        <EntryFieldLabel text="Fecha de ejecucion" help="Fecha y hora real (pasada) o prevista (futura) en la que se ejecuta/ejecutará la operación." />
        <input
          type="datetime-local"
          value={commonForm.plannedAt}
          onChange={(event) => setCommonForm((prev) => ({ ...prev, plannedAt: event.target.value }))}
          inputMode="none"
          onFocus={openDatePicker}
          onClick={openDatePicker}
          onKeyDown={preventManualDateTyping}
          onPaste={preventManualDatePasteOrDrop}
          onDrop={preventManualDatePasteOrDrop}
          required
        />
      </label>

      <label>
        <EntryFieldLabel text="Estado" help="Define si la entrada queda planificada, abierta o completada al registrarla." />
        <select value={commonForm.status} onChange={(event) => setCommonForm((prev) => ({ ...prev, status: event.target.value as MarketEntryStatus }))}>
          <option value="closed">Completada</option>
          <option value="no_entry">Sin entrada</option>
        </select>
      </label>

      {isCompletedOnCreate && (
        <>
          <label>
            <EntryFieldLabel text="Resultado R" help="Usa un unico decimal. Resultado tecnico: -R SL, 0 sin avance, 1 break tecnico 1:1, >1 TP extendido. Resultado financiero: >0 ganancia, 0 breakeven, <0 perdida." />
            <input
              type="number"
              step="0.1"
              value={commonForm.resultR}
              onChange={(event) => setCommonForm((prev) => ({ ...prev, resultR: event.target.value }))}
              placeholder="0.0"
              required
            />
          </label>

          <label>
            <EntryFieldLabel text="Resultado cuenta estimado" help="Se obtiene al multiplicar el Riesgo por cuenta por el Resultado R cuando guardes la entrada." />
            <input value="Se calcula por cuenta al guardar" disabled />
          </label>
        </>
      )}

      <label className="entries-form-span-2">
        <EntryFieldLabel text="Link de la operación" help="Enlace a TradingView, broker o evidencia visual para consultar rápidamente la operación." />
        <input
          type="url"
          value={commonForm.operationLink}
          onChange={(event) => setCommonForm((prev) => ({ ...prev, operationLink: event.target.value }))}
          placeholder="https://..."
        />
      </label>

      <label className="entries-form-span-2">
        <EntryFieldLabel text="Notas" help="Observaciones tácticas para seguimiento y revisión posterior." />
        <textarea value={commonForm.note} onChange={(event) => setCommonForm((prev) => ({ ...prev, note: event.target.value }))} rows={3} />
      </label>

      <div className="entries-accounts-editor entries-form-span-2">
        <div className="entries-accounts-title-row">
          <h3>Cuentas asociadas</h3>
          <button type="button" className="entries-inline-btn" onClick={addAccountRow} disabled={!canAddMoreAccounts}>
            <AppIcon name="check" />
            Agregar cuenta
          </button>
        </div>

        <div className="entries-accounts-table">
          <div className="entries-accounts-head">
            <span>Cuenta</span>
            <span>Riesgo por cuenta (USD)</span>
            <span>Accion</span>
          </div>

          {perAccountRows.map((row, index) => (
            <div className="entries-accounts-row" key={row.id}>
              <select value={row.accountId} onChange={(event) => updateAccountRow(index, { accountId: event.target.value })} required>
                <option value="">Selecciona cuenta</option>
                {accounts
                  .filter((account) => {
                    if (account.id === row.accountId) return true;
                    return !perAccountRows.some((selectedRow) => selectedRow.accountId === account.id);
                  })
                  .map((account) => (
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

              <button type="button" className="entries-inline-btn entries-inline-btn-danger" onClick={() => removeAccountRow(index)} disabled={perAccountRows.length <= 1}>
                <AppIcon name="delete" />
                Quitar
              </button>
            </div>
          ))}
        </div>

        <p className="entries-accounts-summary">Riesgo por cuenta (USD): monto que podrias perder en esa cuenta si el precio toca el SL.</p>
        <p className="entries-accounts-summary">Se crearan {perAccountRows.length} registro(s), uno por cuenta.</p>
      </div>

      {error && <p className="entries-form-error">{error}</p>}

      <div className="entries-form-actions entries-form-span-2">
        <button type="button" className="secondary-btn" onClick={closeModal} disabled={isSubmitting}>Cancelar</button>
        <button type="submit" className="primary-btn" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar entradas'}</button>
      </div>
    </form>
  );
}

interface MarketEntriesEditFormProps {
  accounts: TradingAccount[];
  editingEntry: MarketEntry | null;
  editForm: EditForm;
  setEditForm: Dispatch<SetStateAction<EditForm>>;
  applyCommonToGroup: boolean;
  setApplyCommonToGroup: Dispatch<SetStateAction<boolean>>;
  error: string;
  isSubmitting: boolean;
  closeModal: () => void;
  handleEditSubmit: (event: FormEvent) => Promise<void>;
}

function MarketEntriesEditForm({
  accounts,
  editingEntry,
  editForm,
  setEditForm,
  applyCommonToGroup,
  setApplyCommonToGroup,
  error,
  isSubmitting,
  closeModal,
  handleEditSubmit,
}: Readonly<MarketEntriesEditFormProps>) {
  const calculatedEditResultR = editForm.status === 'closed'
    ? normalizeResultR(toNumber(editForm.resultR))
    : null;
  const calculatedEditAccountResult = editForm.status === 'closed'
    ? calculateAccountResultAmount(toNumber(editForm.riskAmount), calculatedEditResultR)
    : null;
  const showEntryReference = Boolean(editingEntry && editingEntry.status !== 'no_entry');
  const canCorrectNoEntry = editingEntry?.status === 'no_entry';

  return (
    <form className="entries-form" onSubmit={handleEditSubmit}>
      <label>
        <EntryFieldLabel text="Cuenta" help="Cuenta concreta sobre la que estás editando este registro." />
        {canCorrectNoEntry ? (
          <select
            aria-label="Cuenta"
            value={editForm.accountId}
            onChange={(event) => {
              const nextAccountId = event.target.value;
              const nextAccount = accounts.find((account) => account.id === nextAccountId);
              setEditForm((prev) => ({
                ...prev,
                accountId: nextAccountId,
                accountName: nextAccount ? (nextAccount.alias || nextAccount.name) : '',
              }));
            }}
            required
          >
            <option value="">Selecciona cuenta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.alias || account.name}</option>
            ))}
          </select>
        ) : (
          <input value={editingEntry?.accountName ?? ''} disabled />
        )}
      </label>

      <label>
        <EntryFieldLabel text="Simbolo" help="Activo asociado a la entrada; en edición se muestra como referencia." />
        <input value={editingEntry ? resolveEntrySymbol(editingEntry) : ''} disabled />
      </label>

      {showEntryReference && editingEntry && (
        <section className="entries-reference-panel entries-form-span-2" aria-label="Parametros de entrada en solo lectura">
          <h3>Referencia de entrada (solo lectura)</h3>
          <div className="entries-reference-grid">
            <label>
              <EntryFieldLabel text="Direccion" help="Dirección original de la operación registrada." />
              <input value={directionLabel(editingEntry.direction)} disabled />
            </label>
            <label>
              <EntryFieldLabel text="Protocolo vela" help="Clasificación técnica guardada para esta entrada." />
              <input value={candleProtocolLabel(editingEntry.candleProtocol)} disabled />
            </label>
            <label>
              <EntryFieldLabel text="Impacto noticia" help="Impacto asociado a la noticia enlazada, cuando aplica." />
              <input value={newsImpactLabel(editingEntry.newsImpact)} disabled />
            </label>
          </div>
        </section>
      )}

      {canCorrectNoEntry && (
        <label>
          <EntryFieldLabel text="Direccion" help="Selecciona la dirección correcta si esta entrada se genero por error como sin entrada." />
          <select
            aria-label="Direccion"
            value={editForm.direction}
            onChange={(event) => setEditForm((prev) => ({ ...prev, direction: event.target.value as MarketEntryDirection | '' }))}
            required
          >
            <option value="">Selecciona direccion</option>
            <option value="buy">BUY</option>
            <option value="sell">SELL</option>
          </select>
        </label>
      )}

      <label>
        <EntryFieldLabel text="Estado" help="Fase operativa actual de la entrada para control del ciclo." />
        <select aria-label="Estado" value={editForm.status} onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value as MarketEntryStatus }))}>
          <option value="closed">Completada</option>
          <option value="no_entry">Sin entrada</option>
        </select>
      </label>

      <label>
        <EntryFieldLabel text="Fecha de ejecucion" help="Fecha y hora de ejecucion usadas por el dashboard y reportes temporales." />
        <input
          type="datetime-local"
          value={editForm.plannedAt}
          onChange={(event) => setEditForm((prev) => ({ ...prev, plannedAt: event.target.value }))}
          inputMode="none"
          onFocus={openDatePicker}
          onClick={openDatePicker}
          onKeyDown={preventManualDateTyping}
          onPaste={preventManualDatePasteOrDrop}
          onDrop={preventManualDatePasteOrDrop}
          required
        />
      </label>

      {editForm.status === 'no_entry' && (
        <label className="entries-form-span-2">
          <EntryFieldLabel text="Contexto/Noticia" help="Usa este mismo campo como motivo de la entrada sin ejecución." />
          <input
            value={editForm.marketContext}
            onChange={(event) => setEditForm((prev) => ({ ...prev, marketContext: event.target.value }))}
            placeholder="CPI, FOMC, PRE market..."
            required
          />
        </label>
      )}

      <label>
        <EntryFieldLabel text="Riesgo por cuenta (USD)" help="Monto en USD base para calcular el resultado monetario de la operación." />
        <input type="number" step="0.01" min="0" value={editForm.riskAmount} onChange={(event) => setEditForm((prev) => ({ ...prev, riskAmount: event.target.value }))} required />
      </label>

      {editForm.status === 'closed' && (
        <>
          <label>
            <EntryFieldLabel text="Resultado R" help="Usa un unico decimal. Resultado tecnico: -R SL, 0 sin avance, 1 break tecnico 1:1, >1 TP extendido. Resultado financiero: >0 ganancia, 0 breakeven, <0 perdida." />
            <input type="number" step="0.1" value={editForm.resultR} onChange={(event) => setEditForm((prev) => ({ ...prev, resultR: event.target.value }))} required />
          </label>

          <label>
            <EntryFieldLabel text="Resultado cuenta calculado" help="Resultado monetario por cuenta, calculado como Riesgo de cuenta x Resultado R." />
            <input value={calculatedEditAccountResult === null ? 'No calculable' : `$${calculatedEditAccountResult.toFixed(2)}`} disabled />
          </label>
        </>
      )}

      <label className="entries-form-span-2">
        <EntryFieldLabel text="Link de la operación" help="Enlace operativo o evidencia visual relacionada con este registro." />
        <input type="url" value={editForm.operationLink} onChange={(event) => setEditForm((prev) => ({ ...prev, operationLink: event.target.value }))} placeholder="https://..." />
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
        <button type="button" className="secondary-btn" onClick={closeModal} disabled={isSubmitting}>Cancelar</button>
        <button type="submit" className="primary-btn" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</button>
      </div>
    </form>
  );
}

export default function MarketEntriesModule({ userEmail }: Readonly<MarketEntriesModuleProps>) {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [entries, setEntries] = useState<MarketEntry[]>([]);
  const [accountFilter, setAccountFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [mostUsedContexts, setMostUsedContexts] = useState<string[]>([]);
  const [newsQuery, setNewsQuery] = useState('');

  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editingEntry, setEditingEntry] = useState<MarketEntry | null>(null);

  const [commonForm, setCommonForm] = useState<EntryCommonForm>(defaultCommonForm);
  const [perAccountRows, setPerAccountRows] = useState<AccountRowForm[]>([createAccountRow()]);
  const [editForm, setEditForm] = useState<EditForm>(defaultEditForm);
  const [applyCommonToGroup, setApplyCommonToGroup] = useState(false);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const createSubmitLockRef = useRef(false);
  const editSubmitLockRef = useRef(false);
  const entriesModalRef = useRef<HTMLDialogElement | null>(null);

  const canAddMoreAccounts = accounts.length > 0 && perAccountRows.length < accounts.length;
  const isCompletedOnCreate = commonForm.status === 'closed';
  const isNoEntryOnCreate = commonForm.status === 'no_entry';
  const isNewsContextMode = commonForm.contextSource === 'news';
  const pendingEditStorageKey = 'inversiones_pending_entry_edit_id';

  function openPendingEntryById(entryId: string): boolean {
    const pendingEntry = entries.find((entry) => entry.id === entryId);
    if (!pendingEntry) {
      return false;
    }

    setAccountFilter('all');
    setQuery('');
    openEditModal(pendingEntry);
    return true;
  }

  async function loadData() {
    try {
      const [loadedAccounts, loadedEntries, loadedNews, usedContexts] = await Promise.all([
        listTradingAccounts(),
        listMarketEntriesByUser(userEmail),
        listUserNews(userEmail),
        listMostUsedMarketContexts(userEmail),
      ]);

      setAccounts(loadedAccounts);
      setEntries(loadedEntries);
      setNewsArticles(loadedNews);
      setMostUsedContexts(usedContexts);

      if (perAccountRows.length === 1 && !perAccountRows[0].accountId) {
        setPerAccountRows(buildDefaultAccountRows(loadedAccounts));
      }
    } catch {
      setAccounts([]);
      setEntries([]);
      setError('No se pudieron cargar las entradas desde la base de datos.');
    }
  }

  useEffect(() => {
    void loadData();
  }, [userEmail]);

  const filteredNewsArticles = useMemo(() => {
    const term = newsQuery.trim().toLowerCase();
    if (!term) return newsArticles;

    return newsArticles.filter((article) =>
      article.title.toLowerCase().includes(term) ||
      article.summary.toLowerCase().includes(term) ||
      article.category.toLowerCase().includes(term)
    );
  }, [newsArticles, newsQuery]);

  const filteredEntries = useMemo(() => {
    const terms = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return entries
      .filter((entry) => {
        const matchesAccount = accountFilter === 'all' || entry.accountId === accountFilter;
        if (!matchesAccount) return false;
        if (terms.length === 0) return true;

        const technicalOutcome = resolveTechnicalOutcome(entry);
        const financialOutcome = resolveFinancialOutcome(entry);

        const searchableText = [
          entry.accountName,
          resolveEntrySymbol(entry),
          entry.symbol,
          entry.symbolDetail ?? '',
          entry.marketContext,
          entry.setup,
          entry.session,
          candleProtocolLabel(entry.candleProtocol),
          newsImpactLabel(entry.newsImpact),
          directionLabel(entry.direction),
          statusLabel(entry.status),
          technicalOutcome ? technicalOutcomeLabel(technicalOutcome) : '',
          financialOutcome ? financialOutcomeLabel(financialOutcome) : '',
          technicalOutcome === 'tp_partial' || technicalOutcome === 'tp_1_1' || technicalOutcome === 'tp_extended' ? 'take profit' : '',
          technicalOutcome === 'sl' ? 'stop loss' : '',
          entry.note,
          entry.noEntryReason ?? '',
          entry.operationLink ?? '',
          entry.resultR === null ? '' : String(entry.resultR),
          String(entry.riskAmount),
          String(entry.investmentPercent),
        ]
          .join(' ')
          .toLowerCase();

        return terms.every((term) => searchableText.includes(term));
      })
      .sort((a, b) => {
        const createdA = new Date(a.createdAt).getTime();
        const createdB = new Date(b.createdAt).getTime();
        return createdB - createdA;
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

  let entriesContent = (
    <section className="entries-empty">
      <h3>No hay entradas registradas</h3>
      <p>Empieza creando tu primera entrada y asociandola a una o varias cuentas.</p>
    </section>
  );

  if (accounts.length === 0) {
    entriesContent = (
      <section className="entries-empty">
        <h3>No hay cuentas disponibles</h3>
        <p>Crea al menos una cuenta en el modulo de cuentas para registrar entradas multi-cuenta.</p>
      </section>
    );
  } else if (filteredEntries.length > 0) {
    entriesContent = (
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
    );
  }

  function openCreateModal() {
    setModalMode('create');
    setEditingEntry(null);
    setCommonForm(defaultCommonForm);
    setPerAccountRows(buildDefaultAccountRows(accounts));
    setEditForm(defaultEditForm);
    setApplyCommonToGroup(false);
    setNewsQuery('');
    setError('');
    setSuccess('');
  }

  function openEditModal(entry: MarketEntry) {
    setModalMode('edit');
    setEditingEntry(entry);
    setEditForm({
      status: normalizeEditableEntryStatus(entry.status),
      marketContext: entry.marketContext,
      plannedAt: toDateTimeLocalValue(entry.plannedAt),
      accountId: entry.accountId,
      accountName: entry.accountName,
      direction: entry.direction ?? '',
      riskAmount: String(entry.riskAmount),
      resultR: entry.resultR === null ? '0.0' : Number(entry.resultR).toFixed(1),
      operationLink: entry.operationLink ?? '',
      noEntryReason: entry.noEntryReason ?? '',
      note: entry.note,
    });
    setApplyCommonToGroup(false);
    setError('');
    setSuccess('');
  }

  useEffect(() => {
    if (entries.length === 0 || modalMode === 'edit') {
      return;
    }

    let pendingId = '';
    try {
      pendingId = localStorage.getItem(pendingEditStorageKey) ?? '';
    } catch {
      pendingId = '';
    }

    if (!pendingId) {
      return;
    }

    if (!openPendingEntryById(pendingId)) {
      try {
        localStorage.removeItem(pendingEditStorageKey);
      } catch {
        // ignore storage errors
      }
      return;
    }

    try {
      localStorage.removeItem(pendingEditStorageKey);
    } catch {
      // ignore storage errors
    }
  }, [entries, modalMode]);

  useEffect(() => {
    function handleOpenEdit(event: Event) {
      if (modalMode === 'edit') {
        return;
      }

      const customEvent = event as CustomEvent<{ entryId?: string }>;
      const entryId = customEvent.detail?.entryId;
      if (!entryId) {
        return;
      }

      const opened = openPendingEntryById(entryId);
      if (opened) {
        try {
          localStorage.removeItem(pendingEditStorageKey);
        } catch {
          // ignore storage errors
        }
      }
    }

    window.addEventListener('inversiones:open-entry-edit', handleOpenEdit as EventListener);
    return () => {
      window.removeEventListener('inversiones:open-entry-edit', handleOpenEdit as EventListener);
    };
  }, [entries, modalMode]);

  function closeModal() {
    setModalMode(null);
    setEditingEntry(null);
    setApplyCommonToGroup(false);
    setError('');
  }

  useEffect(() => {
    if (!modalMode) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (entriesModalRef.current?.contains(target)) {
        return;
      }

      closeModal();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeModal();
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [modalMode]);

  function addAccountRow() {
    setPerAccountRows((prev) => [...prev, createAccountRow()]);
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
    if (createSubmitLockRef.current) return;

    createSubmitLockRef.current = true;
    setIsCreateSubmitting(true);
    setError('');

    try {
      const perAccount = buildCreatePerAccountSelection(accounts, perAccountRows, isNoEntryOnCreate);
      const { createInput } = buildCreateMarketEntryRequest(commonForm, perAccount, isNoEntryOnCreate, isCompletedOnCreate);
      const created = await createMarketEntriesForAccounts(userEmail, createInput);

      setEntries(await listMarketEntriesByUser(userEmail));
      setMostUsedContexts(await listMostUsedMarketContexts(userEmail));
      setSuccess(`Entrada creada en ${created.length} cuenta(s).`);

      void logAuditActivity('market_entries.create_batch', {
        module: 'market_entries',
        targetType: 'system' as AuditTargetTypeWithSystem,
        source: 'frontend',
        symbol: commonForm.symbol,
        symbolDetail: commonForm.symbol === 'OTRO' ? commonForm.symbolDetail : null,
        contextSource: commonForm.contextSource,
        newsArticleId: commonForm.contextSource === 'news' ? commonForm.newsArticleId : null,
        newsImpact: commonForm.contextSource === 'news' ? commonForm.newsImpact : null,
        candleProtocol: commonForm.candleProtocol,
        operationLink: commonForm.operationLink || null,
        status: commonForm.status,
        accountsCount: perAccount.length,
        accountIds: perAccount.map((item) => item.accountId),
        riskByAccount: perAccount.map((item) => ({ accountId: item.accountId, riskAmount: item.riskAmount, investmentPercent: item.investmentPercent })),
        noEntryReason: isNoEntryOnCreate ? commonForm.noEntryReason : null,
      });

      closeModal();
    } catch (submitError) {
      setError(toErrorMessage(submitError, 'No se pudo guardar la entrada.'));
    } finally {
      createSubmitLockRef.current = false;
      setIsCreateSubmitting(false);
    }
  }

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editingEntry) return;
    if (editSubmitLockRef.current) return;

    editSubmitLockRef.current = true;
    setIsEditSubmitting(true);

    setError('');

    try {
      const calculatedResultR = editForm.status === 'closed'
        ? normalizeResultR(toNumber(editForm.resultR))
        : null;

      if (editForm.status === 'closed' && calculatedResultR === null) {
        throw new Error('No se pudo interpretar el Resultado R ingresado.');
      }

      const result = await updateMarketEntryById(userEmail, editingEntry.id, {
        status: editForm.status,
        marketContext: editForm.marketContext,
        plannedAt: editForm.plannedAt,
        accountId: editForm.accountId || editingEntry.accountId,
        accountName: editForm.accountName || editingEntry.accountName,
        direction: editForm.status === 'no_entry' ? undefined : (editForm.direction || undefined),
        riskAmount: toNumber(editForm.riskAmount),
        investmentPercent: 1,
        resultR: editForm.status === 'closed' ? calculatedResultR : toNumberOrNull(editForm.resultR),
        operationLink: editForm.operationLink,
        noEntryReason: editForm.status === 'no_entry' ? editForm.marketContext : editForm.noEntryReason,
        note: editForm.note,
      }, {
        applyCommonToGroup,
      });

      setEntries(await listMarketEntriesByUser(userEmail));
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
          ? ['status', 'note', 'riskAmount', 'resultR', 'operationLink']
          : ['status', 'riskAmount', 'resultR', 'operationLink', 'note'],
      });

      closeModal();
    } catch (submitError) {
      setError(toErrorMessage(submitError, 'No se pudo actualizar la entrada.'));
    } finally {
      editSubmitLockRef.current = false;
      setIsEditSubmitting(false);
    }
  }

  async function handleDelete(entry: MarketEntry) {
    const entryLabel = entryDeletionLabel(entry);

    if (!globalThis.confirm(`Eliminar ${entryLabel}?`)) return;

    try {
      await deleteMarketEntryById(userEmail, entry.id);
      setEntries(await listMarketEntriesByUser(userEmail));
      setSuccess('Entrada eliminada.');

      void logAuditActivity('market_entries.delete', {
        module: 'market_entries',
        targetType: 'system' as AuditTargetTypeWithSystem,
        source: 'frontend',
        targetId: entry.id,
        accountId: entry.accountId,
      });
    } catch (deleteError) {
      setError(toErrorMessage(deleteError, 'No se pudo eliminar la entrada.'));
    }
  }

  const modal = modalMode
    ? createPortal(
        <div className="entries-modal-overlay">
          <dialog
            className="entries-modal-shell"
            open
            aria-labelledby="entries-modal-title"
            ref={entriesModalRef}
            onCancel={(event) => {
              event.preventDefault();
              closeModal();
            }}
          >
            <div className="entries-modal-header">
              <div>
                <p className="entries-modal-kicker">Registro operativo</p>
                <h2 id="entries-modal-title">{modalMode === 'create' ? 'Nueva entrada al mercado' : 'Editar entrada por cuenta'}</h2>
              </div>
              <button type="button" className="entries-modal-close" onClick={closeModal} aria-label="Cerrar modal" title="Cerrar">
                <AppIcon name="close" />
              </button>
            </div>

            {modalMode === 'create' ? (
              <MarketEntriesCreateForm
                commonForm={commonForm}
                setCommonForm={setCommonForm}
                isNoEntryOnCreate={isNoEntryOnCreate}
                isCompletedOnCreate={isCompletedOnCreate}
                isNewsContextMode={isNewsContextMode}
                newsQuery={newsQuery}
                setNewsQuery={setNewsQuery}
                filteredNewsArticles={filteredNewsArticles}
                mostUsedContexts={mostUsedContexts}
                perAccountRows={perAccountRows}
                updateAccountRow={updateAccountRow}
                accounts={accounts}
                addAccountRow={addAccountRow}
                removeAccountRow={removeAccountRow}
                canAddMoreAccounts={canAddMoreAccounts}
                error={error}
                isSubmitting={isCreateSubmitting}
                closeModal={closeModal}
                handleCreateSubmit={handleCreateSubmit}
              />
            ) : (
              <MarketEntriesEditForm
                accounts={accounts}
                editingEntry={editingEntry}
                editForm={editForm}
                setEditForm={setEditForm}
                applyCommonToGroup={applyCommonToGroup}
                setApplyCommonToGroup={setApplyCommonToGroup}
                error={error}
                isSubmitting={isEditSubmitting}
                closeModal={closeModal}
                handleEditSubmit={handleEditSubmit}
              />
            )}
          </dialog>
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
          <p>Una entrada puede asociarse a varias cuentas, guardando un registro independiente con su riesgo por cuenta.</p>
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
          <strong>{new Set(filteredEntries.filter((entry) => entry.accountId).map((entry) => entry.accountId)).size}</strong>
        </article>
      </section>

      {entriesContent}

      {modal}
    </section>
  );
}
