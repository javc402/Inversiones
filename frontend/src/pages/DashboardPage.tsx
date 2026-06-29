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

function isDashboardTab(value: string | null): value is DashboardTab {
  return value === 'resumen' || value === 'noticias' || value === 'entradas' || value === 'cuentas' || value === 'usuarios' || value === 'configuracion';
}

function loadStoredDashboardTab(): DashboardTab {
  if (globalThis.window === undefined) return 'resumen';
  try {
    const stored = localStorage.getItem(DASHBOARD_TAB_STORAGE_KEY);
    if (isDashboardTab(stored)) return stored;
  } catch {
    // ignore
  }
  return 'resumen';
}

const monthlyProfitData = [
  { month: 'Ene', amount: 1800 },
  { month: 'Feb', amount: 2600 },
  { month: 'Mar', amount: 2400 },
  { month: 'Abr', amount: 3100 },
  { month: 'May', amount: 2950 },
  { month: 'Jun', amount: 3600 },
];

const distributionData = [
  { name: 'Ganadas', value: 69.5 },
  { name: 'Perdidas', value: 21.5 },
  { name: 'Breakeven', value: 9 },
];

const pieColors = ['#1e5ba8', '#ef4444', '#f59e0b'];
const pageTitleByTab: Record<DashboardTab, string> = {
  resumen: 'Dashboard de Inversiones',
  noticias: 'Noticias',
  entradas: 'Entradas al mercado',
  cuentas: 'Cuentas',
  usuarios: 'Usuarios',
  configuracion: 'Configuración',
};

function formatDate(dateValue: string): string {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('es-MX');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function statusLabel(status: MarketEntry['status']): string {
  if (status === 'planned') return 'Planeada';
  if (status === 'open') return 'Abierta';
  if (status === 'closed') return 'Completada';
  if (status === 'no_entry') return 'Sin entrada';
  return 'Cancelada';
}

function roleNameLabel(roleName: Role['name'] | null | undefined): string {
  if (roleName === 'admin') return 'Administrador';
  if (roleName === 'user') return 'Usuario';
  return 'Sin rol';
}

function tradeResultClass(result: string): 'negative' | 'neutral' | 'positive' {
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
  openRisk: number;
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
  openRisk,
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
          <span className="kpi-trend neutral">Sobre operaciones cerradas</span>
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
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={56}
                >
                  {distributionData.map((item, index) => (
                    <Cell key={item.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
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

function prefetchDashboardTab(tab: DashboardTab, isAdmin: boolean): void {
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

  const openRisk = useMemo(() => {
    return filteredEntries
      .filter((entry) => entry.status === 'planned' || entry.status === 'open')
      .reduce((sum, entry) => sum + entry.riskAmount, 0);
  }, [filteredEntries]);

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
      openRisk={openRisk}
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