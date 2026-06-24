import { Suspense, lazy, useEffect, useState } from 'react';
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
import { getCurrentUserRole, Role } from '@services/roles';

const loadAdminPanelModule = () => import('@components/AdminPanel');
const loadAccountsModule = () => import('@components/AccountsModule');
const AdminPanel = lazy(loadAdminPanelModule);
const AccountsModule = lazy(loadAccountsModule);

interface DashboardPageProps {
  userEmail: string;
  onSignOut: () => Promise<void>;
}

type DashboardTab = 'resumen' | 'cuentas' | 'usuarios';

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

const recentTrades = [
  { date: '23/06/2026', pair: 'EURUSD', type: 'BUY', result: '+$350', status: 'Exito' },
  { date: '23/06/2026', pair: 'GBPUSD', type: 'SELL', result: '-$120', status: 'Cierre' },
  { date: '22/06/2026', pair: 'USDMXN', type: 'BUY', result: '+$520', status: 'Exito' },
  { date: '22/06/2026', pair: 'EURGBP', type: 'SELL', result: '+$140', status: 'Exito' },
];

export default function DashboardPage({ userEmail, onSignOut }: Readonly<DashboardPageProps>) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('resumen');
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [collapsedSections, setCollapsedSections] = useState({
    principal: false,
    gestion: false,
  });
  const isAdmin = userRole?.name === 'admin';
  const roleLabel = userRole?.name === 'admin' ? 'Administrador' : userRole?.name === 'user' ? 'Usuario' : 'Sin rol';
  const sidebarUserName = userEmail.includes('@') ? userEmail.split('@')[0] : userEmail;

  function toggleSidebarSection(section: 'principal' | 'gestion') {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function prefetchTabModule(tab: DashboardTab) {
    if (tab === 'cuentas') {
      void loadAccountsModule();
      return;
    }

    if (tab === 'usuarios' && isAdmin) {
      void loadAdminPanelModule();
    }
  }

  useEffect(() => {
    if (activeTab === 'usuarios' && !isAdmin) {
      setActiveTab('resumen');
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
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

    loadRole();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const idleCallback =
      'requestIdleCallback' in window
        ? window.requestIdleCallback(() => {
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
      if (idleCallback !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleCallback);
      }

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [isAdmin]);

  let mainContent = (
    <>
      <section className="kpi-grid">
        <article className="kpi-card">
          <h2>Ganancia del mes</h2>
          <p className="kpi-value">$22,550</p>
          <span className="kpi-trend positive">+33%</span>
        </article>
        <article className="kpi-card">
          <h2>Tasa de exito</h2>
          <p className="kpi-value">69.5%</p>
          <span className="kpi-trend positive">+4.2%</span>
        </article>
        <article className="kpi-card">
          <h2>Riesgo abierto</h2>
          <p className="kpi-value">$2,450</p>
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
              {recentTrades.map((trade) => (
                <tr key={`${trade.date}-${trade.pair}-${trade.type}`}>
                  <td>{trade.date}</td>
                  <td>{trade.pair}</td>
                  <td>{trade.type}</td>
                  <td className={trade.result.startsWith('+') ? 'positive' : 'negative'}>{trade.result}</td>
                  <td>{trade.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  if (activeTab === 'usuarios') {
    if (isAdmin) {
      mainContent = (
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
      );
    } else {
      mainContent = (
        <section className="table-card restricted-card">
          <h2>Gestionar usuarios</h2>
          <p>
            Esta seccion es solo para administradores. Solicita permisos de admin para gestionar usuarios.
          </p>
        </section>
      );
    }
  }

  if (activeTab === 'cuentas') {
    mainContent = (
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
    );
  }

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar" aria-label="Menu lateral del dashboard">
        <div className="sidebar-brand">SOCIO.CO</div>

        <div className="sidebar-section">
          <button
            type="button"
            className="sidebar-nav-section"
            onClick={() => toggleSidebarSection('principal')}
            aria-expanded={!collapsedSections.principal}
            aria-controls="sidebar-principal"
          >
            <span className="sidebar-group-title">
              Principal <span className="sidebar-count">1</span>
            </span>
            <span className="sidebar-section-arrow" aria-hidden="true">
              {collapsedSections.principal ? '▸' : '▾'}
            </span>
          </button>

          <div
            id="sidebar-principal"
            className={`sidebar-section-content ${collapsedSections.principal ? 'collapsed' : ''}`}
          >
            <button
              type="button"
              className={`menu-btn menu-dashboard ${activeTab === 'resumen' ? 'active' : ''}`}
              onClick={() => setActiveTab('resumen')}
            >
              Resumen
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
              Gestion <span className="sidebar-count">{isAdmin ? 2 : 1}</span>
            </span>
            <span className="sidebar-section-arrow" aria-hidden="true">
              {collapsedSections.gestion ? '▸' : '▾'}
            </span>
          </button>

          <div
            id="sidebar-gestion"
            className={`sidebar-section-content ${collapsedSections.gestion ? 'collapsed' : ''}`}
          >
            <button
              type="button"
              className={`menu-btn menu-accounts ${activeTab === 'cuentas' ? 'active' : ''}`}
              onClick={() => setActiveTab('cuentas')}
              onMouseEnter={() => prefetchTabModule('cuentas')}
              onFocus={() => prefetchTabModule('cuentas')}
            >
              Gestionar cuentas
            </button>
            {isAdmin && (
              <button
                type="button"
                className={`menu-btn menu-users ${activeTab === 'usuarios' ? 'active' : ''}`}
                onClick={() => setActiveTab('usuarios')}
                onMouseEnter={() => prefetchTabModule('usuarios')}
                onFocus={() => prefetchTabModule('usuarios')}
              >
                Gestionar usuarios
              </button>
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <p className="sidebar-user-email">{sidebarUserName}</p>
          <p className="sidebar-user-role">{roleLabel.toUpperCase()}</p>
        </div>
      </aside>

      <section className="dashboard-layout">
        <header className="dashboard-header">
          <div>
            <h1>Dashboard de Inversiones</h1>
            <p>{userEmail}</p>
            <p className="dashboard-role">Rol: {roleLabel}</p>
          </div>
          <div className="header-right">
            <span className="system-status">Sistema online</span>
            <button className="secondary-btn" type="button" onClick={onSignOut}>
              Cerrar sesion
            </button>
          </div>
        </header>

        {mainContent}
      </section>
    </main>
  );
}