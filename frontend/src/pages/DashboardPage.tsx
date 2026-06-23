import { useEffect, useState } from 'react';
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
import AdminPanel from '@components/AdminPanel';
import { getCurrentUserRole, Role } from '@services/roles';

interface DashboardPageProps {
  userEmail: string;
  onSignOut: () => Promise<void>;
}

type DashboardTab = 'resumen' | 'usuarios';

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
  const isAdmin = userRole?.name === 'admin';

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

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar" aria-label="Menu lateral del dashboard">
        <h2>Menu</h2>
        <button
          type="button"
          className={`menu-btn ${activeTab === 'resumen' ? 'active' : ''}`}
          onClick={() => setActiveTab('resumen')}
        >
          Resumen
        </button>
        <button
          type="button"
          className={`menu-btn ${activeTab === 'usuarios' ? 'active' : ''}`}
          onClick={() => setActiveTab('usuarios')}
        >
          Gestionar usuarios
        </button>
      </aside>

      <section className="dashboard-layout">
        <header className="dashboard-header">
          <div>
            <h1>Dashboard de Inversiones</h1>
            <p>{userEmail}</p>
          </div>
          <button className="secondary-btn" type="button" onClick={onSignOut}>
            Cerrar sesion
          </button>
        </header>

        {activeTab === 'usuarios' ? (
          isAdmin ? (
            <AdminPanel />
          ) : (
            <section className="table-card restricted-card">
              <h2>Gestionar usuarios</h2>
              <p>
                Esta seccion es solo para administradores. Solicita permisos de admin para gestionar usuarios.
              </p>
            </section>
          )
        ) : (
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
        )}
      </section>
    </main>
  );
}