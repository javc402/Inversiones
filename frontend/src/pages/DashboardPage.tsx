import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { AppIcon } from '@components/AppIcon';
import { listTradingAccounts, TradingAccount } from '@services/accounts';
import { listMarketEntriesByUser, MarketEntry, MarketEntryStatus, updateMarketEntryById } from '@services/market-entries';
import { getCurrentUserRole, Role } from '@services/roles';

const loadAdminPanelModule = () => import('@components/AdminPanel');
const loadAccountsModule = () => import('@components/AccountsModule');
const loadSettingsModule = () => import('@components/SettingsModule');
const loadNewsModule = () => import('@components/NewsModule');
const loadMarketEntriesModule = () => import('@components/MarketEntriesModule');
const AdminPanel = lazy(loadAdminPanelModule);
const AccountsModule = lazy(loadAccountsModule);
const SettingsModule = lazy(loadSettingsModule);
const NewsModule = lazy(loadNewsModule);
const MarketEntriesModule = lazy(loadMarketEntriesModule);

interface DashboardPageProps {
  userEmail: string;
  initialRole?: Role | null;
  onSignOut: () => Promise<void>;
}

type DashboardTab = 'resumen' | 'noticias' | 'entradas' | 'cuentas' | 'usuarios' | 'configuracion';

const DASHBOARD_TAB_STORAGE_KEY = 'inversiones_dashboard_active_tab';

export function isDashboardTab(value: string | null): value is DashboardTab {
  return value === 'resumen' || value === 'noticias' || value === 'entradas' || value === 'cuentas' || value === 'usuarios' || value === 'configuracion';
}

export function loadStoredDashboardTab(): DashboardTab {
  if (globalThis.window === undefined) return 'resumen';
  try {
    const stored = localStorage.getItem(DASHBOARD_TAB_STORAGE_KEY);
    if (isDashboardTab(stored)) return stored;
  } catch {
    // ignore
  }
  return 'resumen';
}

const pieColors = ['#1e5ba8', '#ef4444', '#f59e0b'];
const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const monthFilterLabels = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface DistributionSlice {
  name: 'Ganadas' | 'Perdidas' | 'Breakeven';
  value: number;
  operations: number;
  totalAmount: number;
  averageAmount: number;
  color: string;
}

export function distributionAmountLabel(value: number): string {
  if (value > 0) return `+${formatCurrency(value)}`;
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  return formatCurrency(0);
}

export function calculateProfitFactor(winAmount: number, lossAmount: number): string {
  const absoluteLoss = Math.abs(lossAmount);
  if (absoluteLoss === 0) {
    return winAmount > 0 ? '∞' : '0.00';
  }

  return (winAmount / absoluteLoss).toFixed(2);
}

export function getEntryExecutionDate(entry: Pick<MarketEntry, 'status' | 'plannedAt' | 'updatedAt' | 'createdAt'>): string {
  // Regla de negocio: el dashboard usa fecha de ejecucion (plannedAt).
  const planned = new Date(entry.plannedAt);
  if (!Number.isNaN(planned.getTime())) {
    return entry.plannedAt;
  }

  const updated = new Date(entry.updatedAt);
  if (!Number.isNaN(updated.getTime())) {
    return entry.updatedAt;
  }

  return entry.createdAt;
}

export function technicalOutcomeLabel(entry: Pick<MarketEntry, 'status' | 'resultR'>): string {
  if (entry.status !== 'closed' || entry.resultR === null) return 'N/A';
  if (entry.resultR < 0) return 'SL';
  if (entry.resultR === 0) return 'Sin avance';
  if (entry.resultR === 1) return 'Break tecnico 1:1';
  if (entry.resultR > 1) return 'TP extendido';
  return 'TP parcial';
}

export function financialOutcomeLabel(entry: Pick<MarketEntry, 'status' | 'resultR'>): string {
  if (entry.status !== 'closed' || entry.resultR === null) return 'N/A';
  if (entry.resultR < 0) return 'Perdida';
  if (entry.resultR === 1) return 'Breakeven';
  if (entry.resultR > 0) return 'Ganancia';
  return 'Breakeven';
}

export function isTechnicalBreakEven(entry: Pick<MarketEntry, 'status' | 'resultR'>): boolean {
  return entry.status === 'closed' && entry.resultR === 1;
}

export function financialResultAmount(entry: Pick<MarketEntry, 'status' | 'resultR' | 'riskAmount'>): number | null {
  if (entry.status !== 'closed' || entry.resultR === null) {
    return null;
  }

  if (isTechnicalBreakEven(entry)) {
    return 0;
  }

  return entry.riskAmount * entry.resultR;
}

export function calculateMonthlyProfitData(
  filteredEntries: MarketEntry[],
  now: Date = new Date(),
  chartMode: 'recent6' | 'fullYear' | 'centered5' = 'recent6',
): Array<{ month: string; amount: number }> {
  let chartMonths: Array<{ key: string; month: string }>;

  if (chartMode === 'fullYear') {
    chartMonths = Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), index, 1);
      return {
        key: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        month: monthLabels[monthDate.getMonth()],
      };
    });
  } else if (chartMode === 'centered5') {
    chartMonths = Array.from({ length: 5 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + (index - 2), 1);
      return {
        key: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        month: monthLabels[monthDate.getMonth()],
      };
    });
  } else {
    chartMonths = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        month: monthLabels[monthDate.getMonth()],
      };
    });
  }

  const totalsByMonth = new Map<string, number>(chartMonths.map((item) => [item.key, 0]));

  for (const entry of filteredEntries) {
    if (entry.resultR === null) {
      continue;
    }

    const referenceDate = new Date(getEntryExecutionDate(entry));
    if (Number.isNaN(referenceDate.getTime())) {
      continue;
    }

    const monthKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
    if (!totalsByMonth.has(monthKey)) {
      continue;
    }

    // La serie temporal refleja el resultado monetario de la operacion por fecha de ejecucion.
    totalsByMonth.set(monthKey, (totalsByMonth.get(monthKey) ?? 0) + (entry.riskAmount * entry.resultR));
  }

  return chartMonths.map((item) => ({
    month: item.month,
    amount: totalsByMonth.get(item.key) ?? 0,
  }));
}
const pageTitleByTab: Record<DashboardTab, string> = {
  resumen: 'Dashboard de Inversiones',
  noticias: 'Noticias',
  entradas: 'Entradas al mercado',
  cuentas: 'Cuentas',
  usuarios: 'Usuarios',
  configuracion: 'Configuración',
};

export function formatDate(dateValue: string): string {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('es-MX');
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export function statusLabel(status: MarketEntry['status']): string {
  if (status === 'planned') return 'Planeada';
  if (status === 'open') return 'Abierta';
  if (status === 'closed') return 'Completada';
  if (status === 'no_entry') return 'Sin entrada';
  return 'Cancelada';
}

export function roleNameLabel(roleName: Role['name'] | null | undefined): string {
  if (roleName === 'admin') return 'Administrador';
  if (roleName === 'user') return 'Usuario';
  return 'Sin rol';
}

export function tradeResultClass(result: string, isTechnicalBreak = false): 'negative' | 'neutral' | 'positive' | 'breakeven' {
  if (isTechnicalBreak) return 'breakeven';
  if (result.startsWith('-')) return 'negative';
  if (result === 'N/A') return 'neutral';
  return 'positive';
}

type DashboardEditForm = {
  status: MarketEntryStatus;
  plannedAt: string;
  riskAmount: string;
  investmentPercent: string;
  resultR: string;
  operationLink: string;
  note: string;
  noEntryReason: string;
};

function toDateTimeLocalValue(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 16);
  }

  return parsed.toISOString().slice(0, 16);
}

function openOperationLink(operationLink: string | null) {
  if (!operationLink) {
    return;
  }

  window.open(operationLink, '_blank', 'noopener,noreferrer');
}

function resolveMonthlyReferenceDate(filteredEntries: MarketEntry[], selectedYear: string): Date {
  if (filteredEntries.length > 0) {
    const latestTimestamp = filteredEntries.reduce((latest, entry) => {
      const current = new Date(getEntryExecutionDate(entry)).getTime();
      if (Number.isNaN(current)) return latest;
      return Math.max(latest, current);
    }, Number.NEGATIVE_INFINITY);

    if (Number.isFinite(latestTimestamp)) {
      return new Date(latestTimestamp);
    }
  }

  if (selectedYear !== 'all') {
    const selectedYearNumber = Number.parseInt(selectedYear, 10);
    if (Number.isFinite(selectedYearNumber)) {
      return new Date(selectedYearNumber, 11, 1);
    }
  }

  return new Date();
}

function parseDashboardEditValues(form: DashboardEditForm): {
  resultRValue: number | null;
  riskAmount: number;
  investmentPercent: number;
} {
  const resultRValue = form.status === 'closed' ? Number.parseFloat(form.resultR) : null;

  if (form.status === 'closed' && !Number.isFinite(resultRValue ?? Number.NaN)) {
    throw new Error('El Resultado R debe ser valido para estado Completada.');
  }

  return {
    resultRValue,
    riskAmount: Number.parseFloat(form.riskAmount),
    investmentPercent: Number.parseFloat(form.investmentPercent),
  };
}

function filterEntriesForSummary(
  entries: MarketEntry[],
  selectedAccountId: string,
  selectedYear: string,
  selectedMonth: string,
): MarketEntry[] {
  let filtered = entries;

  if (selectedAccountId !== 'all') {
    filtered = filtered.filter((entry) => entry.accountId === selectedAccountId);
  }

  if (selectedYear !== 'all') {
    const year = Number.parseInt(selectedYear, 10);
    filtered = filtered.filter((entry) => {
      const entryDate = new Date(getEntryExecutionDate(entry));
      return !Number.isNaN(entryDate.getTime()) && entryDate.getFullYear() === year;
    });
  }

  if (selectedMonth !== 'all') {
    const month = Number.parseInt(selectedMonth, 10);
    filtered = filtered.filter((entry) => {
      const entryDate = new Date(getEntryExecutionDate(entry));
      return !Number.isNaN(entryDate.getTime()) && entryDate.getMonth() === month;
    });
  }

  return filtered;
}

interface DashboardTabPanelsProps {
  activeTab: DashboardTab;
  mainContent: JSX.Element;
  userEmail: string;
  isAdmin: boolean;
}

interface DashboardSummaryContentProps {
  selectedAccountId: string;
  setSelectedAccountId: (value: string) => void;
  summaryAccounts: TradingAccount[];
  monthlyProfit: number;
  filteredEntries: MarketEntry[];
  winRate: number;
  winTotal: number;
  lossRate: number;
  lossTotal: number;
  openRisk: number;
  monthlyProfitData: Array<{
    month: string;
    amount: number;
  }>;
  distributionData: Array<{
    name: 'Ganadas' | 'Perdidas' | 'Breakeven';
    value: number;
    operations: number;
    totalAmount: number;
    averageAmount: number;
    color: string;
  }>;
  netResult: number;
  profitFactor: string;
  winLossRatio: string;
  recentTrades: Array<{
    entryId: string;
    date: string;
    pair: string;
    type: string;
    investedAmount: string;
    result: string;
    technicalOutcome: string;
    financialOutcome: string;
    isTechnicalBreak: boolean;
    operationLink: string | null;
    status: string;
  }>;
  selectedYear: string;
  setSelectedYear: (value: string) => void;
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
  availableMonths: number[];
  onOpenEntry: (entryId: string) => void;
  onOpenLink: (operationLink: string | null) => void;
}

type RecentTradeFilters = {
  date: string;
  pair: string;
  type: string;
  investedAmount: string;
  result: string;
  technicalOutcome: string;
  financialOutcome: string;
  status: string;
};

function DashboardSummaryContent({
  selectedAccountId,
  setSelectedAccountId,
  summaryAccounts,
  monthlyProfit,
  filteredEntries,
  winRate,
  winTotal,
  lossRate,
  lossTotal,
  openRisk,
  monthlyProfitData,
  distributionData,
  netResult,
  profitFactor,
  winLossRatio,
  recentTrades,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  availableMonths,
  onOpenEntry,
  onOpenLink,
}: Readonly<DashboardSummaryContentProps>) {
  const profitKpiTitle = selectedMonth === 'all' ? 'Ganancias del año' : 'Ganancias del mes';

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const entry of filteredEntries) {
      const date = new Date(getEntryExecutionDate(entry));
      if (!Number.isNaN(date.getTime())) {
        years.add(date.getFullYear());
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [filteredEntries]);
  const [tableFilters, setTableFilters] = useState<RecentTradeFilters>({
    date: '',
    pair: '',
    type: '',
    investedAmount: '',
    result: '',
    technicalOutcome: '',
    financialOutcome: '',
    status: '',
  });

  const filteredRecentTrades = useMemo(() => {
    const normalized = {
      date: tableFilters.date.toLowerCase().trim(),
      pair: tableFilters.pair.toLowerCase().trim(),
      type: tableFilters.type.toLowerCase().trim(),
      investedAmount: tableFilters.investedAmount.toLowerCase().trim(),
      result: tableFilters.result.toLowerCase().trim(),
      technicalOutcome: tableFilters.technicalOutcome.toLowerCase().trim(),
      financialOutcome: tableFilters.financialOutcome.toLowerCase().trim(),
      status: tableFilters.status.toLowerCase().trim(),
    };

    const filterPairs: Array<[string, string]> = [
      [normalized.date, 'date'],
      [normalized.pair, 'pair'],
      [normalized.type, 'type'],
      [normalized.investedAmount, 'investedAmount'],
      [normalized.result, 'result'],
      [normalized.technicalOutcome, 'technicalOutcome'],
      [normalized.financialOutcome, 'financialOutcome'],
      [normalized.status, 'status'],
    ];

    return recentTrades.filter((trade) =>
      filterPairs.every(([term, key]) => {
        if (!term) return true;
        const value = String(trade[key as keyof typeof trade]).toLowerCase();
        return value.includes(term);
      })
    );
  }, [recentTrades, tableFilters]);
  return (
    <>
      <section className="dashboard-summary-toolbar">
        <label htmlFor="dashboard-account-filter" className="dashboard-summary-filter-label">Filtrar por cuenta</label>
        <select
          id="dashboard-account-filter"
          className="dashboard-summary-filter"
          value={selectedAccountId}
          onChange={(event) => setSelectedAccountId(event.target.value)}
        >
          <option value="all">Todas las cuentas</option>
          {summaryAccounts.map((account) => (
            <option key={account.id} value={account.id}>{account.alias || account.name}</option>
          ))}
        </select>

        <label htmlFor="dashboard-year-filter" className="dashboard-summary-filter-label">Filtrar por año</label>
        <select
          id="dashboard-year-filter"
          className="dashboard-summary-filter"
          value={selectedYear}
          onChange={(event) => setSelectedYear(event.target.value)}
        >
          <option value="all">Todos los años</option>
          {availableYears.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <label htmlFor="dashboard-month-filter" className="dashboard-summary-filter-label">Filtrar por mes</label>
        <select
          id="dashboard-month-filter"
          className="dashboard-summary-filter"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
        >
          <option value="all">Todos los meses</option>
          {availableMonths.map((month) => (
            <option key={month} value={month}>{monthFilterLabels[month]}</option>
          ))}
        </select>
      </section>

      <section className="kpi-grid">
        <article className="kpi-card">
          <h2>{profitKpiTitle}</h2>
          <p className="kpi-value">{formatCurrency(monthlyProfit)}</p>
          <span className={`kpi-trend ${monthlyProfit >= 0 ? 'positive' : 'negative'}`}>
            {filteredEntries.length} operaciones
          </span>
        </article>
        <article className="kpi-card">
          <h2>Tasa de exito</h2>
          <p className="kpi-value">{winRate.toFixed(1)}%</p>
          <span className="kpi-trend positive">Total ganado: {formatCurrency(winTotal)}</span>
        </article>
        <article className="kpi-card">
          <h2>Tasa de perdida</h2>
          <p className="kpi-value">{lossRate.toFixed(1)}%</p>
          <span className="kpi-trend negative">Total perdido: {formatCurrency(lossTotal)}</span>
        </article>
        <article className="kpi-card">
          <h2>Riesgo abierto</h2>
          <p className="kpi-value">{formatCurrency(openRisk)}</p>
          <span className="kpi-trend neutral">Controlado</span>
        </article>
      </section>

      <section className="chart-grid">
        <article className="chart-card">
          <h2>Evolucion de ganancias</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyProfitData}>
                <CartesianGrid strokeDasharray="4 4" stroke="#dbeafe" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="amount" stroke="#1e5ba8" fill="#bfdbfe" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-card">
          <h2>Distribucion de operaciones</h2>
          <div className="chart-distribution-layout">
            <div className="chart-wrapper chart-wrapper-distribution">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    innerRadius={64}
                  >
                    {distributionData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, props) => {
                      const item = props.payload as DistributionSlice;
                      return [`${Number(value).toFixed(1)}% · ${item.operations} ops · ${distributionAmountLabel(item.totalAmount)}`, item.name];
                    }}
                  />
                  <Legend formatter={(value) => `${value} ${(distributionData.find((entry) => entry.name === value)?.value ?? 0).toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="distribution-details" aria-label="Resumen de distribución de operaciones">
              {distributionData.map((item) => (
                <article key={item.name} className="distribution-row">
                  <h3 style={{ color: item.color }}>{item.name}</h3>
                  <p>{item.value.toFixed(1)}% · {item.operations} operaciones</p>
                  <p>Total: {distributionAmountLabel(item.totalAmount)}</p>
                  <p>Promedio: {distributionAmountLabel(item.averageAmount)}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="distribution-summary" aria-label="Métricas de desempeño">
            <article>
              <h3>Neto del periodo</h3>
              <p className={netResult >= 0 ? 'positive' : 'negative'}>{distributionAmountLabel(netResult)}</p>
            </article>
            <article>
              <h3>Profit Factor</h3>
              <p>{profitFactor}</p>
            </article>
            <article>
              <h3>Win/Loss ratio</h3>
              <p>{winLossRatio}</p>
            </article>
          </div>
        </article>
      </section>

      <section className="table-card">
        <h2>Operaciones recientes</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Par</th>
                <th>Tipo</th>
                <th>Invertido</th>
                <th>Resultado</th>
                <th>Tecnico</th>
                <th>Financiero</th>
                <th>Estado</th>
                <th>Accion</th>
              </tr>
              <tr className="table-filter-row">
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar fecha"
                    className="table-filter-input"
                    value={tableFilters.date}
                    onChange={(event) => setTableFilters((prev) => ({ ...prev, date: event.target.value }))}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar par"
                    className="table-filter-input"
                    value={tableFilters.pair}
                    onChange={(event) => setTableFilters((prev) => ({ ...prev, pair: event.target.value }))}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar tipo"
                    className="table-filter-input"
                    value={tableFilters.type}
                    onChange={(event) => setTableFilters((prev) => ({ ...prev, type: event.target.value }))}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar invertido"
                    className="table-filter-input"
                    value={tableFilters.investedAmount}
                    onChange={(event) => setTableFilters((prev) => ({ ...prev, investedAmount: event.target.value }))}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar resultado"
                    className="table-filter-input"
                    value={tableFilters.result}
                    onChange={(event) => setTableFilters((prev) => ({ ...prev, result: event.target.value }))}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar tecnico"
                    className="table-filter-input"
                    value={tableFilters.technicalOutcome}
                    onChange={(event) => setTableFilters((prev) => ({ ...prev, technicalOutcome: event.target.value }))}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar financiero"
                    className="table-filter-input"
                    value={tableFilters.financialOutcome}
                    onChange={(event) => setTableFilters((prev) => ({ ...prev, financialOutcome: event.target.value }))}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar estado"
                    className="table-filter-input"
                    value={tableFilters.status}
                    onChange={(event) => setTableFilters((prev) => ({ ...prev, status: event.target.value }))}
                  />
                </td>
                <td aria-label="Sin filtro de acciones" />
              </tr>
            </thead>
            <tbody>
              {filteredRecentTrades.length === 0 ? (
                <tr>
                  <td colSpan={9}>No hay operaciones para el filtro seleccionado.</td>
                </tr>
              ) : (
                filteredRecentTrades
                  .map((trade) => (
                    <tr key={trade.entryId}>
                      <td>{trade.date}</td>
                      <td>{trade.pair}</td>
                      <td>{trade.type}</td>
                      <td>{trade.investedAmount}</td>
                      <td className={tradeResultClass(trade.result, trade.isTechnicalBreak)}>{trade.result}</td>
                      <td>{trade.technicalOutcome}</td>
                      <td>{trade.financialOutcome}</td>
                      <td>{trade.status}</td>
                      <td>
                        <div className="table-actions-group">
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => onOpenEntry(trade.entryId)}
                            aria-label={`Editar entrada ${trade.pair}`}
                            title="Ver y editar entrada"
                          >
                            <AppIcon name="eye" />
                          </button>
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => onOpenLink(trade.operationLink)}
                            aria-label={`Abrir link de ${trade.pair}`}
                            title="Abrir link de operación"
                            disabled={!trade.operationLink}
                          >
                            <AppIcon name="link" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function DashboardTabPanels({ activeTab, mainContent, userEmail, isAdmin }: Readonly<DashboardTabPanelsProps>) {
  return (
    <>
      <div style={{ display: activeTab === 'resumen' ? 'block' : 'none' }} role="tabpanel" aria-labelledby="tab-resumen">
        {mainContent}
      </div>

      <div style={{ display: activeTab === 'noticias' ? 'block' : 'none' }} role="tabpanel" aria-labelledby="tab-noticias">
        <Suspense
          fallback={
            <section className="table-card">
              <h2>Mis noticias</h2>
              <p>Cargando módulo de noticias...</p>
            </section>
          }
        >
          <NewsModule userEmail={userEmail} />
        </Suspense>
      </div>

      <div style={{ display: activeTab === 'entradas' ? 'block' : 'none' }} role="tabpanel" aria-labelledby="tab-entradas">
        <Suspense
          fallback={
            <section className="table-card">
              <h2>Entradas al mercado</h2>
              <p>Cargando módulo de entradas...</p>
            </section>
          }
        >
          <MarketEntriesModule userEmail={userEmail} />
        </Suspense>
      </div>

      <div style={{ display: activeTab === 'cuentas' ? 'block' : 'none' }} role="tabpanel" aria-labelledby="tab-cuentas">
        <Suspense
          fallback={
            <section className="table-card">
              <h2>Gestionar cuentas</h2>
              <p>Cargando modulo de cuentas...</p>
            </section>
          }
        >
          <AccountsModule />
        </Suspense>
      </div>

      <div style={{ display: activeTab === 'usuarios' ? 'block' : 'none' }} role="tabpanel" aria-labelledby="tab-usuarios">
        {isAdmin ? (
          <Suspense
            fallback={
              <section className="table-card">
                <h2>Gestionar usuarios</h2>
                <p>Cargando panel...</p>
              </section>
            }
          >
            <AdminPanel />
          </Suspense>
        ) : (
          <section className="table-card restricted-card">
            <h2>Gestionar usuarios</h2>
            <p>
              Esta seccion es solo para administradores. Solicita permisos de admin para gestionar usuarios.
            </p>
          </section>
        )}
      </div>

      <div style={{ display: activeTab === 'configuracion' ? 'block' : 'none' }} role="tabpanel" aria-labelledby="tab-configuracion">
        <Suspense
          fallback={
            <section className="table-card">
              <h2>Configuración</h2>
              <p>Cargando configuración...</p>
            </section>
          }
        >
          <SettingsModule userEmail={userEmail} isAdmin={isAdmin} />
        </Suspense>
      </div>
    </>
  );
}

export function prefetchDashboardTab(tab: DashboardTab, isAdmin: boolean): void {
  if (tab === 'noticias') {
    void loadNewsModule();
    return;
  }

  if (tab === 'cuentas') {
    void loadAccountsModule();
    return;
  }

  if (tab === 'entradas') {
    void loadMarketEntriesModule();
    return;
  }

  if (tab === 'configuracion') {
    void loadSettingsModule();
    return;
  }

  if (tab === 'usuarios' && isAdmin) {
    void loadAdminPanelModule();
  }
}

function useDashboardModulePrefetch(isAdmin: boolean): void {
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const idleCallback =
      'requestIdleCallback' in globalThis
        ? globalThis.requestIdleCallback(() => {
            void loadAccountsModule();
            if (isAdmin) {
              void loadAdminPanelModule();
            }
          })
        : null;

    if (idleCallback === null) {
      timeoutId = setTimeout(() => {
        void loadAccountsModule();
        if (isAdmin) {
          void loadAdminPanelModule();
        }
      }, 800);
    }

    return () => {
      if (idleCallback !== null && 'cancelIdleCallback' in globalThis) {
        globalThis.cancelIdleCallback(idleCallback);
      }

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [isAdmin]);
}

function useEnsureSelectedAccountExists(
  selectedAccountId: string,
  summaryAccounts: TradingAccount[],
  setSelectedAccountId: (value: string) => void,
): void {
  useEffect(() => {
    if (selectedAccountId === 'all') return;
    if (!summaryAccounts.some((account) => account.id === selectedAccountId)) {
      setSelectedAccountId('all');
    }
  }, [selectedAccountId, summaryAccounts, setSelectedAccountId]);
}

function useEnsureSelectedMonthExists(
  selectedMonth: string,
  availableMonths: number[],
  setSelectedMonth: (value: string) => void,
): void {
  useEffect(() => {
    if (selectedMonth === 'all') return;
    const month = Number.parseInt(selectedMonth, 10);
    if (!availableMonths.includes(month)) {
      setSelectedMonth('all');
    }
  }, [selectedMonth, availableMonths, setSelectedMonth]);
}

function useResolvedUserRole(
  initialRole: Role | null | undefined,
  setUserRole: (role: Role | null) => void,
): void {
  useEffect(() => {
    if (initialRole !== undefined) {
      setUserRole(initialRole);
      return;
    }

    let isMounted = true;

    async function loadRole() {
      try {
        const role = await getCurrentUserRole();
        if (isMounted) {
          setUserRole(role);
        }
      } catch {
        if (isMounted) {
          setUserRole(null);
        }
      }
    }

    void loadRole();

    return () => {
      isMounted = false;
    };
  }, [initialRole, setUserRole]);
}

function useSummaryData(
  activeTab: DashboardTab,
  userEmail: string,
  setSummaryAccounts: (accounts: TradingAccount[]) => void,
  setSummaryEntries: (entries: MarketEntry[]) => void,
): void {
  useEffect(() => {
    if (activeTab !== 'resumen') return;

    let isMounted = true;

    async function loadSummaryDataInternal() {
      try {
        const accounts = await listTradingAccounts();
        if (!isMounted) return;

        setSummaryAccounts(accounts);
        setSummaryEntries(await listMarketEntriesByUser(userEmail));
      } catch {
        if (!isMounted) return;
        setSummaryAccounts([]);
        setSummaryEntries([]);
      }
    }

    void loadSummaryDataInternal();

    return () => {
      isMounted = false;
    };
  }, [activeTab, userEmail, setSummaryAccounts, setSummaryEntries]);
}

function useEnsureAdminTabAccess(
  activeTab: DashboardTab,
  isAdmin: boolean,
  setActiveTab: (tab: DashboardTab) => void,
): void {
  useEffect(() => {
    if (activeTab === 'usuarios' && !isAdmin) {
      setActiveTab('resumen');
    }
  }, [activeTab, isAdmin, setActiveTab]);
}

function usePersistDashboardTab(activeTab: DashboardTab): void {
  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_TAB_STORAGE_KEY, activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);
}

export default function DashboardPage({ userEmail, initialRole, onSignOut }: Readonly<DashboardPageProps>) { // NOSONAR
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => loadStoredDashboardTab());
  const [userRole, setUserRole] = useState<Role | null>(initialRole ?? null);
  const [collapsedSections, setCollapsedSections] = useState({
    principal: false,
    gestion: false,
    cuenta: false,
  });
  const [summaryAccounts, setSummaryAccounts] = useState<TradingAccount[]>([]);
  const [summaryEntries, setSummaryEntries] = useState<MarketEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<MarketEntry | null>(null);
  const [dashboardEditForm, setDashboardEditForm] = useState<DashboardEditForm | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const isAdmin = userRole?.name === 'admin';
  const roleLabel = roleNameLabel(userRole?.name);
  const sidebarUserName = userEmail.includes('@') ? userEmail.split('@')[0] : userEmail;
  const pageTitle = pageTitleByTab[activeTab];

  const editModalOpen = editingEntry !== null && dashboardEditForm !== null;

  useDashboardModulePrefetch(isAdmin);
  useEnsureSelectedAccountExists(selectedAccountId, summaryAccounts, setSelectedAccountId);
  useResolvedUserRole(initialRole, setUserRole);
  useSummaryData(activeTab, userEmail, setSummaryAccounts, setSummaryEntries);
  useEnsureAdminTabAccess(activeTab, isAdmin, setActiveTab);
  usePersistDashboardTab(activeTab);

  function toggleSidebarSection(section: 'principal' | 'gestion' | 'cuenta') {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  const filteredEntries = useMemo(() => {
    return filterEntriesForSummary(summaryEntries, selectedAccountId, selectedYear, selectedMonth);
  }, [selectedAccountId, selectedYear, selectedMonth, summaryEntries]);

  const monthSelectorEntries = useMemo(() => {
    return filterEntriesForSummary(summaryEntries, selectedAccountId, selectedYear, 'all');
  }, [selectedAccountId, selectedYear, summaryEntries]);

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    for (const entry of monthSelectorEntries) {
      const date = new Date(getEntryExecutionDate(entry));
      if (!Number.isNaN(date.getTime())) {
        months.add(date.getMonth());
      }
    }

    return Array.from(months).sort((a, b) => a - b);
  }, [monthSelectorEntries]);

  useEnsureSelectedMonthExists(selectedMonth, availableMonths, setSelectedMonth);

  const monthlyProfit = useMemo(() => {
    return filteredEntries
      .filter((entry) => entry.resultR !== null)
      .reduce((sum, entry) => sum + (financialResultAmount(entry) ?? 0), 0);
  }, [filteredEntries]);

  const winRate = useMemo(() => {
    const entriesWithResult = filteredEntries.filter((entry) => entry.resultR !== null);
    if (entriesWithResult.length === 0) return 0;
    const wins = entriesWithResult.filter((entry) => financialOutcomeLabel(entry) === 'Ganancia').length;
    return (wins / entriesWithResult.length) * 100;
  }, [filteredEntries]);

  const lossRate = useMemo(() => {
    const entriesWithResult = filteredEntries.filter((entry) => entry.resultR !== null);
    if (entriesWithResult.length === 0) return 0;
    const losses = entriesWithResult.filter((entry) => financialOutcomeLabel(entry) === 'Perdida').length;
    return (losses / entriesWithResult.length) * 100;
  }, [filteredEntries]);

  const winTotal = useMemo(() => {
    return filteredEntries
      .reduce((sum, entry) => sum + Math.max(financialResultAmount(entry) ?? 0, 0), 0);
  }, [filteredEntries]);

  const lossTotal = useMemo(() => {
    return filteredEntries
      .reduce((sum, entry) => {
        const value = financialResultAmount(entry) ?? 0;
        return value < 0 ? sum + value : sum;
      }, 0);
  }, [filteredEntries]);

  const openRisk = useMemo(() => {
    return filteredEntries
      .filter((entry) => entry.status === 'planned' || entry.status === 'open')
      .reduce((sum, entry) => sum + entry.riskAmount, 0);
  }, [filteredEntries]);

  const monthlyProfitData = useMemo(() => {
    return calculateMonthlyProfitData(
      filteredEntries,
      resolveMonthlyReferenceDate(filteredEntries, selectedYear),
      selectedMonth === 'all' ? 'fullYear' : 'centered5',
    );
  }, [filteredEntries, selectedYear, selectedMonth]);

  const distributionData = useMemo<DistributionSlice[]>(() => {
    const entriesWithResult = filteredEntries.filter((entry) => entry.resultR !== null);
    if (entriesWithResult.length === 0) {
      return [
        { name: 'Ganadas', value: 0, operations: 0, totalAmount: 0, averageAmount: 0, color: pieColors[0] },
        { name: 'Perdidas', value: 0, operations: 0, totalAmount: 0, averageAmount: 0, color: pieColors[1] },
        { name: 'Breakeven', value: 0, operations: 0, totalAmount: 0, averageAmount: 0, color: pieColors[2] },
      ];
    }

    const winningEntries = entriesWithResult.filter((entry) => financialOutcomeLabel(entry) === 'Ganancia');
    const losingEntries = entriesWithResult.filter((entry) => financialOutcomeLabel(entry) === 'Perdida');
    const breakevenEntries = entriesWithResult.filter((entry) => isTechnicalBreakEven(entry));

    const wins = winningEntries.length;
    const losses = losingEntries.length;
    const breakeven = breakevenEntries.length;

    const winsTotal = winningEntries.reduce((sum, entry) => sum + (financialResultAmount(entry) ?? 0), 0);
    const lossesTotal = losingEntries.reduce((sum, entry) => sum + (financialResultAmount(entry) ?? 0), 0);
    const breakevenTotal = breakevenEntries.reduce((sum, entry) => sum + (entry.riskAmount * (entry.resultR ?? 0)), 0);

    return [
      {
        name: 'Ganadas',
        value: Number(((wins / entriesWithResult.length) * 100).toFixed(1)),
        operations: wins,
        totalAmount: winsTotal,
        averageAmount: wins === 0 ? 0 : winsTotal / wins,
        color: pieColors[0],
      },
      {
        name: 'Perdidas',
        value: Number(((losses / entriesWithResult.length) * 100).toFixed(1)),
        operations: losses,
        totalAmount: lossesTotal,
        averageAmount: losses === 0 ? 0 : lossesTotal / losses,
        color: pieColors[1],
      },
      {
        name: 'Breakeven',
        value: Number(((breakeven / entriesWithResult.length) * 100).toFixed(1)),
        operations: breakeven,
        totalAmount: breakevenTotal,
        averageAmount: breakeven === 0 ? 0 : breakevenTotal / breakeven,
        color: pieColors[2],
      },
    ];
  }, [filteredEntries]);

  const netResult = useMemo(() => winTotal + lossTotal, [winTotal, lossTotal]);

  const profitFactor = useMemo(() => {
    return calculateProfitFactor(winTotal, lossTotal);
  }, [winTotal, lossTotal]);

  const winLossRatio = useMemo(() => {
    const wins = distributionData.find((entry) => entry.name === 'Ganadas')?.operations ?? 0;
    const losses = distributionData.find((entry) => entry.name === 'Perdidas')?.operations ?? 0;
    return `${wins}:${losses}`;
  }, [distributionData]);

  const recentTrades = useMemo(() => {
    const sortedEntries = [...filteredEntries].sort((a, b) => {
        const dateA = new Date(getEntryExecutionDate(a)).getTime();
        const dateB = new Date(getEntryExecutionDate(b)).getTime();
        return dateB - dateA;
      });

    return sortedEntries
      .slice(0, 8)
      .map((entry) => {
        const resultValue = entry.resultR === null ? 'N/A' : formatCurrency(entry.riskAmount * entry.resultR);
        return {
          entryId: entry.id,
          date: formatDate(getEntryExecutionDate(entry)),
          pair: entry.symbol,
          type: entry.direction.toUpperCase(),
          investedAmount: formatCurrency(entry.riskAmount),
          result: resultValue,
          technicalOutcome: technicalOutcomeLabel(entry),
          financialOutcome: financialOutcomeLabel(entry),
          isTechnicalBreak: isTechnicalBreakEven(entry),
          operationLink: entry.operationLink,
          status: statusLabel(entry.status),
        };
      });
  }, [filteredEntries]);

  function openEditEntryModal(entry: MarketEntry) {
    setEditingEntry(entry);
    setDashboardEditForm({
      status: entry.status,
      plannedAt: toDateTimeLocalValue(entry.plannedAt),
      riskAmount: String(entry.riskAmount),
      investmentPercent: String(entry.investmentPercent),
      resultR: entry.resultR === null ? '0.0' : Number(entry.resultR).toFixed(1),
      operationLink: entry.operationLink ?? '',
      note: entry.note,
      noEntryReason: entry.noEntryReason ?? '',
    });
    setEditError('');
  }

  function closeEditEntryModal() {
    setEditingEntry(null);
    setDashboardEditForm(null);
    setEditError('');
  }

  function openEntryFromSummary(entryId: string) {
    const entry = summaryEntries.find((item) => item.id === entryId);
    if (!entry) {
      return;
    }

    openEditEntryModal(entry);
  }

  async function saveEntryFromDashboard() {
    if (!editingEntry || !dashboardEditForm || isSavingEdit) {
      return;
    }

    setIsSavingEdit(true);
    setEditError('');

    try {
      const { resultRValue, riskAmount, investmentPercent } = parseDashboardEditValues(dashboardEditForm);

      await updateMarketEntryById(userEmail, editingEntry.id, {
        status: dashboardEditForm.status,
        plannedAt: dashboardEditForm.plannedAt,
        riskAmount,
        investmentPercent,
        resultR: dashboardEditForm.status === 'closed' ? resultRValue : null,
        operationLink: dashboardEditForm.operationLink,
        noEntryReason: dashboardEditForm.noEntryReason,
        note: dashboardEditForm.note,
      });

      setSummaryEntries(await listMarketEntriesByUser(userEmail));
      closeEditEntryModal();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'No se pudo actualizar la entrada.');
    } finally {
      setIsSavingEdit(false);
    }
  }

  const mainContent = (
    <DashboardSummaryContent
      selectedAccountId={selectedAccountId}
      setSelectedAccountId={setSelectedAccountId}
      summaryAccounts={summaryAccounts}
      monthlyProfit={monthlyProfit}
      filteredEntries={filteredEntries}
      winRate={winRate}
      winTotal={winTotal}
      lossRate={lossRate}
      lossTotal={lossTotal}
      openRisk={openRisk}
      monthlyProfitData={monthlyProfitData}
      distributionData={distributionData}
      netResult={netResult}
      profitFactor={profitFactor}
      winLossRatio={winLossRatio}
      recentTrades={recentTrades}
      selectedYear={selectedYear}
      setSelectedYear={setSelectedYear}
      selectedMonth={selectedMonth}
      setSelectedMonth={setSelectedMonth}
      availableMonths={availableMonths}
      onOpenEntry={openEntryFromSummary}
      onOpenLink={openOperationLink}
    />
  );

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar" aria-label="Menu lateral del dashboard">
        <div className="sidebar-brand">
          <AppIcon name="brand" className="sidebar-brand-icon" />
          <span className="sidebar-brand-text">Inversiones</span>
        </div>

        <div className="sidebar-scroll">
          <div className="sidebar-section">
            <button
              type="button"
              className="sidebar-nav-section"
              onClick={() => toggleSidebarSection('principal')}
              aria-expanded={!collapsedSections.principal}
              aria-controls="sidebar-principal"
            >
              <span className="sidebar-group-title">
                <span className="sidebar-group-icon">
                  <AppIcon name="dashboard" />
                </span>
                Principal{' '}
                <span className="sidebar-count">1</span>
              </span>
              <span className="sidebar-section-arrow" aria-hidden="true">
                <AppIcon name={collapsedSections.principal ? 'chevronRight' : 'chevronDown'} />
              </span>
            </button>

            <div id="sidebar-principal" className={`sidebar-section-content ${collapsedSections.principal ? 'collapsed' : ''}`}>
              <button type="button" className={`menu-btn menu-dashboard ${activeTab === 'resumen' ? 'active' : ''}`} onClick={() => setActiveTab('resumen')}>
                <AppIcon name="dashboard" className="menu-btn-icon" />
                <span>Resumen</span>
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <button
              type="button"
              className="sidebar-nav-section"
              onClick={() => toggleSidebarSection('gestion')}
              aria-expanded={!collapsedSections.gestion}
              aria-controls="sidebar-gestion"
            >
              <span className="sidebar-group-title">
                <span className="sidebar-group-icon">
                  <AppIcon name="accounts" />
                </span>
                Gestion{' '}
                <span className="sidebar-count">{isAdmin ? 3 : 2}</span>
              </span>
              <span className="sidebar-section-arrow" aria-hidden="true">
                <AppIcon name={collapsedSections.gestion ? 'chevronRight' : 'chevronDown'} />
              </span>
            </button>

            <div id="sidebar-gestion" className={`sidebar-section-content ${collapsedSections.gestion ? 'collapsed' : ''}`}>
              <button type="button" className={`menu-btn menu-news ${activeTab === 'noticias' ? 'active' : ''}`} onClick={() => setActiveTab('noticias')} onMouseEnter={() => prefetchDashboardTab('noticias', isAdmin)} onFocus={() => prefetchDashboardTab('noticias', isAdmin)}>
                <AppIcon name="article" className="menu-btn-icon" />
                <span>Mis noticias</span>
              </button>
              <button type="button" className={`menu-btn menu-entries ${activeTab === 'entradas' ? 'active' : ''}`} onClick={() => setActiveTab('entradas')} onMouseEnter={() => prefetchDashboardTab('entradas', isAdmin)} onFocus={() => prefetchDashboardTab('entradas', isAdmin)}>
                <AppIcon name="entry" className="menu-btn-icon" />
                <span>Entradas mercado</span>
              </button>
              <button type="button" className={`menu-btn menu-accounts ${activeTab === 'cuentas' ? 'active' : ''}`} onClick={() => setActiveTab('cuentas')} onMouseEnter={() => prefetchDashboardTab('cuentas', isAdmin)} onFocus={() => prefetchDashboardTab('cuentas', isAdmin)}>
                <AppIcon name="accounts" className="menu-btn-icon" />
                <span>Gestionar cuentas</span>
              </button>
              {isAdmin && (
                <button type="button" className={`menu-btn menu-users ${activeTab === 'usuarios' ? 'active' : ''}`} onClick={() => setActiveTab('usuarios')} onMouseEnter={() => prefetchDashboardTab('usuarios', isAdmin)} onFocus={() => prefetchDashboardTab('usuarios', isAdmin)}>
                  <AppIcon name="users" className="menu-btn-icon" />
                  <span>Gestionar usuarios</span>
                </button>
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <button
              type="button"
              className="sidebar-nav-section"
              onClick={() => toggleSidebarSection('cuenta')}
              aria-expanded={!collapsedSections.cuenta}
              aria-controls="sidebar-cuenta"
            >
              <span className="sidebar-group-title">
                <span className="sidebar-group-icon">
                  <AppIcon name="settings" />
                </span>
                Mi cuenta{' '}
                <span className="sidebar-count">1</span>
              </span>
              <span className="sidebar-section-arrow" aria-hidden="true">
                <AppIcon name={collapsedSections.cuenta ? 'chevronRight' : 'chevronDown'} />
              </span>
            </button>

            <div id="sidebar-cuenta" className={`sidebar-section-content ${collapsedSections.cuenta ? 'collapsed' : ''}`}>
              <button type="button" className={`menu-btn menu-settings ${activeTab === 'configuracion' ? 'active' : ''}`} onClick={() => setActiveTab('configuracion')} onMouseEnter={() => prefetchDashboardTab('configuracion', isAdmin)} onFocus={() => prefetchDashboardTab('configuracion', isAdmin)}>
                <AppIcon name="settings" className="menu-btn-icon" />
                <span>Configuración</span>
              </button>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user-avatar" aria-hidden="true">
            <AppIcon name="users" />
          </div>
          <div className="sidebar-user-copy">
            <p className="sidebar-user-name">{sidebarUserName}</p>
            <p className="sidebar-user-role">{roleLabel.toUpperCase()}</p>
            <p className="sidebar-user-email" title={userEmail}>{userEmail}</p>
          </div>
        </div>
      </aside>

      <section className="dashboard-layout">
        <header className="dashboard-header">
          <div className="dashboard-header-title">
            <h1>{pageTitle}</h1>
          </div>
          <div className="header-right">
            <span className="system-status"><AppIcon name="system" /> <span>Sistema online</span></span>
            <button className="secondary-btn" type="button" onClick={onSignOut}>
              <AppIcon name="logout" />
              Cerrar sesion
            </button>
          </div>
        </header>

        <DashboardTabPanels activeTab={activeTab} mainContent={mainContent} userEmail={userEmail} isAdmin={isAdmin} />
      </section>

      {editModalOpen && dashboardEditForm && (
        <dialog className="dashboard-edit-overlay" open aria-labelledby="dashboard-edit-title">
          <div className="dashboard-edit-modal">
            <header className="dashboard-edit-header">
              <h2 id="dashboard-edit-title">Editar entrada</h2>
              <button type="button" className="dashboard-edit-close" onClick={closeEditEntryModal} aria-label="Cerrar modal">
                <AppIcon name="close" />
              </button>
            </header>

            <div className="dashboard-edit-grid">
              <label>
                <span>Estado</span>
                <select
                  value={dashboardEditForm.status}
                  onChange={(event) => setDashboardEditForm((prev) => prev ? { ...prev, status: event.target.value as MarketEntryStatus } : prev)}
                >
                  <option value="planned">Planificada</option>
                  <option value="open">Abierta</option>
                  <option value="closed">Completada</option>
                  <option value="no_entry">Sin entrada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </label>

              <label>
                <span>Fecha de ejecución</span>
                <input
                  type="datetime-local"
                  value={dashboardEditForm.plannedAt}
                  onChange={(event) => setDashboardEditForm((prev) => prev ? { ...prev, plannedAt: event.target.value } : prev)}
                />
              </label>

              <label>
                <span>Riesgo por cuenta (USD)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dashboardEditForm.riskAmount}
                  onChange={(event) => setDashboardEditForm((prev) => prev ? { ...prev, riskAmount: event.target.value } : prev)}
                />
              </label>

              <label>
                <span>% inversión</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dashboardEditForm.investmentPercent}
                  onChange={(event) => setDashboardEditForm((prev) => prev ? { ...prev, investmentPercent: event.target.value } : prev)}
                />
              </label>

              <label>
                <span>Resultado R</span>
                <input
                  type="number"
                  step="0.1"
                  value={dashboardEditForm.resultR}
                  onChange={(event) => setDashboardEditForm((prev) => prev ? { ...prev, resultR: event.target.value } : prev)}
                  disabled={dashboardEditForm.status !== 'closed'}
                />
              </label>

              <label>
                <span>Link de operación</span>
                <input
                  type="url"
                  value={dashboardEditForm.operationLink}
                  onChange={(event) => setDashboardEditForm((prev) => prev ? { ...prev, operationLink: event.target.value } : prev)}
                  placeholder="https://..."
                />
              </label>

              {dashboardEditForm.status === 'no_entry' && (
                <label className="dashboard-edit-span-2">
                  <span>Motivo sin entrada</span>
                  <input
                    value={dashboardEditForm.noEntryReason}
                    onChange={(event) => setDashboardEditForm((prev) => prev ? { ...prev, noEntryReason: event.target.value } : prev)}
                  />
                </label>
              )}

              <label className="dashboard-edit-span-2">
                <span>Notas</span>
                <textarea
                  rows={3}
                  value={dashboardEditForm.note}
                  onChange={(event) => setDashboardEditForm((prev) => prev ? { ...prev, note: event.target.value } : prev)}
                />
              </label>
            </div>

            {editError && <p className="dashboard-edit-error">{editError}</p>}

            <footer className="dashboard-edit-actions">
              <button type="button" className="secondary-btn" onClick={closeEditEntryModal} disabled={isSavingEdit}>Cancelar</button>
              <button type="button" className="primary-btn" onClick={() => void saveEntryFromDashboard()} disabled={isSavingEdit}>
                {isSavingEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </footer>
          </div>
        </dialog>
      )}
    </main>
  );
}