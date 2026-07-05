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
import { listMarketEntriesByUser, MarketEntry } from '@services/market-entries';
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

interface DistributionSlice {
  name: 'Ganadas' | 'Perdidas' | 'Breakeven';
  value: number;
  operations: number;
  totalAmount: number;
  averageAmount: number;
  color: string;
}

function distributionAmountLabel(value: number): string {
  if (value > 0) return `+${formatCurrency(value)}`;
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  return formatCurrency(0);
}

function DistributionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DistributionSlice }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="distribution-tooltip">
      <p><strong>{item.name}</strong></p>
      <p>{item.value.toFixed(1)}%</p>
      <p>{item.operations} operaciones</p>
      <p>Total: {distributionAmountLabel(item.totalAmount)}</p>
      <p>Promedio: {distributionAmountLabel(item.averageAmount)}</p>
    </div>
  );
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

export function tradeResultClass(result: string): 'negative' | 'neutral' | 'positive' {
  if (result.startsWith('-')) return 'negative';
  if (result === 'N/A') return 'neutral';
  return 'positive';
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
    date: string;
    pair: string;
    type: string;
    result: string;
    status: string;
  }>;
}

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
}: Readonly<DashboardSummaryContentProps>) {
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
      </section>

      <section className="kpi-grid">
        <article className="kpi-card">
          <h2>Ganancia del mes</h2>
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
                  <Tooltip content={<DistributionTooltip />} />
                  <Legend formatter={(value) => {
                    const item = distributionData.find((entry) => entry.name === value);
                    return item ? `${value} ${item.value.toFixed(1)}%` : value;
                  }} />
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
                <th>Resultado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.length === 0 ? (
                <tr>
                  <td colSpan={5}>No hay operaciones para el filtro seleccionado.</td>
                </tr>
              ) : (
                recentTrades.map((trade) => (
                  <tr key={`${trade.date}-${trade.pair}-${trade.type}`}>
                    <td>{trade.date}</td>
                    <td>{trade.pair}</td>
                    <td>{trade.type}</td>
                    <td className={tradeResultClass(trade.result)}>{trade.result}</td>
                    <td>{trade.status}</td>
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

export default function DashboardPage({ userEmail, initialRole, onSignOut }: Readonly<DashboardPageProps>) {
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => loadStoredDashboardTab());
  const [userRole, setUserRole] = useState<Role | null>(initialRole ?? null);
  const [collapsedSections, setCollapsedSections] = useState({
    principal: false,
    gestion: false,
    cuenta: false,
  });
  const [summaryAccounts, setSummaryAccounts] = useState<TradingAccount[]>([]);
  const [summaryEntries, setSummaryEntries] = useState<MarketEntry[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const isAdmin = userRole?.name === 'admin';
  const roleLabel = roleNameLabel(userRole?.name);
  const sidebarUserName = userEmail.includes('@') ? userEmail.split('@')[0] : userEmail;
  const pageTitle = pageTitleByTab[activeTab];

  useDashboardModulePrefetch(isAdmin);

  function toggleSidebarSection(section: 'principal' | 'gestion' | 'cuenta') {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  useEffect(() => {
    if (activeTab === 'usuarios' && !isAdmin) {
      setActiveTab('resumen');
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_TAB_STORAGE_KEY, activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);

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
  }, [initialRole]);

  useEffect(() => {
    if (activeTab !== 'resumen') return;

    let isMounted = true;

    async function loadSummaryData() {
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

    void loadSummaryData();

    return () => {
      isMounted = false;
    };
  }, [activeTab, userEmail]);

  useEffect(() => {
    if (selectedAccountId === 'all') return;
    if (!summaryAccounts.some((account) => account.id === selectedAccountId)) {
      setSelectedAccountId('all');
    }
  }, [selectedAccountId, summaryAccounts]);

  const filteredEntries = useMemo(() => {
    if (selectedAccountId === 'all') return summaryEntries;
    return summaryEntries.filter((entry) => entry.accountId === selectedAccountId);
  }, [selectedAccountId, summaryEntries]);

  const monthlyProfit = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return filteredEntries
      .filter((entry) => {
        if (entry.resultR === null) return false;
        const updatedAt = new Date(entry.updatedAt);
        return updatedAt.getMonth() === currentMonth && updatedAt.getFullYear() === currentYear;
      })
      .reduce((sum, entry) => sum + entry.riskAmount * (entry.resultR ?? 0), 0);
  }, [filteredEntries]);

  const winRate = useMemo(() => {
    const entriesWithResult = filteredEntries.filter((entry) => entry.resultR !== null);
    if (entriesWithResult.length === 0) return 0;
    const wins = entriesWithResult.filter((entry) => (entry.resultR ?? 0) > 0).length;
    return (wins / entriesWithResult.length) * 100;
  }, [filteredEntries]);

  const lossRate = useMemo(() => {
    const entriesWithResult = filteredEntries.filter((entry) => entry.resultR !== null);
    if (entriesWithResult.length === 0) return 0;
    const losses = entriesWithResult.filter((entry) => (entry.resultR ?? 0) < 0).length;
    return (losses / entriesWithResult.length) * 100;
  }, [filteredEntries]);

  const winTotal = useMemo(() => {
    return filteredEntries
      .filter((entry) => (entry.resultR ?? 0) > 0)
      .reduce((sum, entry) => sum + entry.riskAmount * (entry.resultR ?? 0), 0);
  }, [filteredEntries]);

  const lossTotal = useMemo(() => {
    return filteredEntries
      .filter((entry) => (entry.resultR ?? 0) < 0)
      .reduce((sum, entry) => sum + entry.riskAmount * (entry.resultR ?? 0), 0);
  }, [filteredEntries]);

  const openRisk = useMemo(() => {
    return filteredEntries
      .filter((entry) => entry.status === 'planned' || entry.status === 'open')
      .reduce((sum, entry) => sum + entry.riskAmount, 0);
  }, [filteredEntries]);

  const monthlyProfitData = useMemo(() => {
    const now = new Date();
    const recentMonths = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        month: monthLabels[monthDate.getMonth()],
      };
    });

    const totalsByMonth = new Map<string, number>(recentMonths.map((item) => [item.key, 0]));

    for (const entry of filteredEntries) {
      if (entry.resultR === null) {
        continue;
      }

      const referenceDate = new Date(entry.updatedAt || entry.createdAt);
      if (Number.isNaN(referenceDate.getTime())) {
        continue;
      }

      const monthKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
      if (!totalsByMonth.has(monthKey)) {
        continue;
      }

      totalsByMonth.set(monthKey, (totalsByMonth.get(monthKey) ?? 0) + entry.riskAmount * entry.resultR);
    }

    return recentMonths.map((item) => ({
      month: item.month,
      amount: totalsByMonth.get(item.key) ?? 0,
    }));
  }, [filteredEntries]);

  const distributionData = useMemo<DistributionSlice[]>(() => {
    const entriesWithResult = filteredEntries.filter((entry) => entry.resultR !== null);
    if (entriesWithResult.length === 0) {
      return [
        { name: 'Ganadas', value: 0, operations: 0, totalAmount: 0, averageAmount: 0, color: pieColors[0] },
        { name: 'Perdidas', value: 0, operations: 0, totalAmount: 0, averageAmount: 0, color: pieColors[1] },
        { name: 'Breakeven', value: 0, operations: 0, totalAmount: 0, averageAmount: 0, color: pieColors[2] },
      ];
    }

    const winningEntries = entriesWithResult.filter((entry) => (entry.resultR ?? 0) > 0);
    const losingEntries = entriesWithResult.filter((entry) => (entry.resultR ?? 0) < 0);
    const breakevenEntries = entriesWithResult.filter((entry) => (entry.resultR ?? 0) === 0);

    const wins = winningEntries.length;
    const losses = losingEntries.length;
    const breakeven = breakevenEntries.length;

    const winsTotal = winningEntries.reduce((sum, entry) => sum + entry.riskAmount * (entry.resultR ?? 0), 0);
    const lossesTotal = losingEntries.reduce((sum, entry) => sum + entry.riskAmount * (entry.resultR ?? 0), 0);
    const breakevenTotal = 0;

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
        averageAmount: 0,
        color: pieColors[2],
      },
    ];
  }, [filteredEntries]);

  const netResult = useMemo(() => winTotal + lossTotal, [winTotal, lossTotal]);

  const profitFactor = useMemo(() => {
    const absoluteLoss = Math.abs(lossTotal);
    if (absoluteLoss === 0) {
      return winTotal > 0 ? '∞' : '0.00';
    }

    return (winTotal / absoluteLoss).toFixed(2);
  }, [winTotal, lossTotal]);

  const winLossRatio = useMemo(() => {
    const wins = distributionData.find((entry) => entry.name === 'Ganadas')?.operations ?? 0;
    const losses = distributionData.find((entry) => entry.name === 'Perdidas')?.operations ?? 0;
    return `${wins}:${losses}`;
  }, [distributionData]);

  const recentTrades = useMemo(() => {
    return filteredEntries.slice(0, 8).map((entry) => {
      const resultValue = entry.resultR === null ? 'N/A' : formatCurrency(entry.riskAmount * entry.resultR);
      return {
        date: formatDate(entry.updatedAt || entry.createdAt),
        pair: entry.symbol,
        type: entry.direction.toUpperCase(),
        result: resultValue,
        status: statusLabel(entry.status),
      };
    });
  }, [filteredEntries]);

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
    </main>
  );
}