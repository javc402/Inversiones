import { ReactNode, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AppIcon } from './AppIcon';

export interface DashboardSelectOption {
  value: string;
  label: string;
}

export interface DashboardKpiItem {
  title: string;
  value: string;
  trend: string;
  trendClass: 'positive' | 'negative' | 'neutral' | 'breakeven';
}

export interface DashboardChartPoint {
  month: string;
  amount: number;
  lossAmount: number;
  breakevenAmount: number;
}

export interface DashboardDistributionItem {
  name: string;
  value: number;
  operations: number;
  totalAmount: number;
  averageAmount: number;
  color: string;
}

export interface DashboardInsightItem {
  title: string;
  value: string;
  detail?: string;
}

export interface DashboardMetricItem {
  title: string;
  value: string;
  valueClass?: 'positive' | 'negative' | 'neutral' | 'breakeven';
}

interface DashboardSummaryLayoutProps {
  idPrefix?: string;
  accountFilterLabel?: string;
  accountFilterValue: string;
  onAccountFilterChange: (value: string) => void;
  accountOptions: DashboardSelectOption[];
  yearFilterValue: string;
  onYearFilterChange: (value: string) => void;
  yearOptions: DashboardSelectOption[];
  monthFilterValue: string;
  onMonthFilterChange: (value: string) => void;
  monthOptions: DashboardSelectOption[];
  monthFilterDisabled?: boolean;
  kpis: DashboardKpiItem[];
  chartTitle: string;
  chartData: DashboardChartPoint[];
  chartLabelFormatter: (label: string) => string;
  amountFormatter: (value: number) => string;
  distributionAmountFormatter: (value: number) => string;
  chartInsights: DashboardInsightItem[];
  distributionTitle: string;
  distributionData: DashboardDistributionItem[];
  distributionMetrics: DashboardMetricItem[];
  children: ReactNode;
}

export default function DashboardSummaryLayout({
  idPrefix = 'dashboard',
  accountFilterLabel = 'Filtrar por cuenta',
  accountFilterValue,
  onAccountFilterChange,
  accountOptions,
  yearFilterValue,
  onYearFilterChange,
  yearOptions,
  monthFilterValue,
  onMonthFilterChange,
  monthOptions,
  monthFilterDisabled = false,
  kpis,
  chartTitle,
  chartData,
  chartLabelFormatter,
  amountFormatter,
  distributionAmountFormatter,
  chartInsights,
  distributionTitle,
  distributionData,
  distributionMetrics,
  children,
}: Readonly<DashboardSummaryLayoutProps>) {
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="dashboard-filters-fab"
        aria-label="Mostrar u ocultar filtros"
        aria-expanded={filtersPanelOpen}
        onClick={() => setFiltersPanelOpen((prev) => !prev)}
      >
        <AppIcon name="settings" />
        <span>Filtros</span>
      </button>

      <button
        type="button"
        className={`dashboard-filters-overlay ${filtersPanelOpen ? 'visible' : ''}`}
        aria-label="Cerrar panel de filtros"
        onClick={() => setFiltersPanelOpen(false)}
      />

      <section className={`dashboard-summary-toolbar ${filtersPanelOpen ? 'open' : ''}`}>
        <div className="dashboard-summary-toolbar-mobile-head">
          <p>Filtros del dashboard</p>
          <button
            type="button"
            className="dashboard-summary-toolbar-close"
            aria-label="Cerrar filtros"
            onClick={() => setFiltersPanelOpen(false)}
          >
            <AppIcon name="close" />
          </button>
        </div>

        <label htmlFor={`${idPrefix}-account-filter`} className="dashboard-summary-filter-label">{accountFilterLabel}</label>
        <select
          id={`${idPrefix}-account-filter`}
          className="dashboard-summary-filter"
          value={accountFilterValue}
          onChange={(event) => onAccountFilterChange(event.target.value)}
        >
          {accountOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <label htmlFor={`${idPrefix}-year-filter`} className="dashboard-summary-filter-label">Filtrar por año</label>
        <select
          id={`${idPrefix}-year-filter`}
          className="dashboard-summary-filter"
          value={yearFilterValue}
          onChange={(event) => onYearFilterChange(event.target.value)}
        >
          {yearOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <label htmlFor={`${idPrefix}-month-filter`} className="dashboard-summary-filter-label">Filtrar por mes</label>
        <select
          id={`${idPrefix}-month-filter`}
          className="dashboard-summary-filter"
          value={monthFilterValue}
          onChange={(event) => onMonthFilterChange(event.target.value)}
          disabled={monthFilterDisabled}
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </section>

      <section className="kpi-grid">
        {kpis.map((kpi) => (
          <article key={kpi.title} className="kpi-card">
            <h2>{kpi.title}</h2>
            <p className="kpi-value">{kpi.value}</p>
            <span className={`kpi-trend ${kpi.trendClass}`}>{kpi.trend}</span>
          </article>
        ))}
      </section>

      <section className="chart-grid">
        <article className="chart-card">
          <h2>{chartTitle}</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" stroke="#dbeafe" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  labelFormatter={chartLabelFormatter}
                  formatter={(value: number, name: string) => {
                    if (name === 'perdidas') return [amountFormatter(value), 'Perdidas'];
                    if (name === 'breakeven') return [amountFormatter(value), 'Breakeven'];
                    return [amountFormatter(value), 'Resultado neto (solo ganancias)'];
                  }}
                />
                <Area type="monotone" dataKey="amount" name="neto" stroke="#1e5ba8" fill="#bfdbfe" fillOpacity={0.42} strokeWidth={2} />
                <Area type="monotone" dataKey="lossAmount" name="perdidas" stroke="#dc2626" fill="#fecaca" fillOpacity={0.5} strokeWidth={2} />
                <Area type="monotone" dataKey="breakevenAmount" name="breakeven" stroke="#ea580c" fill="#fed7aa" fillOpacity={0.45} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-color-legend" aria-label="Leyenda de colores de la gráfica">
            <span className="chart-color-legend-item">
              <span className="chart-color-dot chart-color-dot-net" aria-hidden="true" />
              <span>Resultado neto (solo ganancias)</span>
            </span>
            <span className="chart-color-legend-item">
              <span className="chart-color-dot chart-color-dot-loss" aria-hidden="true" />
              <span>Perdidas</span>
            </span>
            <span className="chart-color-legend-item">
              <span className="chart-color-dot chart-color-dot-breakeven" aria-hidden="true" />
              <span>Breakeven</span>
            </span>
          </div>
          <div className="chart-insights-separator" aria-hidden="true" />
          <section className="chart-insights" aria-label="Indicadores clave de la gráfica">
            {chartInsights.map((item, index) => (
              <article key={`${item.title}-${index}`}>
                <h3>{item.title}</h3>
                <p>{item.value}</p>
                {item.detail && <span>{item.detail}</span>}
              </article>
            ))}
          </section>
        </article>

        <article className="chart-card">
          <h2>{distributionTitle}</h2>
          <div className="chart-distribution-layout">
            <div className="chart-wrapper chart-wrapper-distribution">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={64}>
                    {distributionData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, props) => {
                      const item = props.payload as DashboardDistributionItem;
                      return [`${Number(value).toFixed(1)}% · ${item.operations} ops · ${distributionAmountFormatter(item.totalAmount)}`, item.name];
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
                  <p>Total: {distributionAmountFormatter(item.totalAmount)}</p>
                  <p>Promedio: {distributionAmountFormatter(item.averageAmount)}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="distribution-summary" aria-label="Métricas de desempeño">
            {distributionMetrics.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p className={item.valueClass}>{item.value}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      {children}
    </>
  );
}