import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DashboardSummaryLayout, {
  type DashboardChartPoint,
  type DashboardDistributionItem,
  type DashboardInsightItem,
  type DashboardKpiItem,
  type DashboardMetricItem,
  type DashboardSelectOption,
} from '@components/DashboardSummaryLayout';

const capturedAreaTooltipProps: Array<Record<string, unknown>> = [];
const capturedPieTooltipProps: Array<Record<string, unknown>> = [];
const capturedLegendProps: Array<Record<string, unknown>> = [];

vi.mock('recharts', () => {
  const passthrough = ({ children }: { children?: unknown }) => <div>{children}</div>;

  return {
    ResponsiveContainer: passthrough,
    AreaChart: passthrough,
    PieChart: passthrough,
    Area: passthrough,
    Pie: passthrough,
    Cell: passthrough,
    XAxis: passthrough,
    YAxis: passthrough,
    CartesianGrid: passthrough,
    Tooltip: (props: Record<string, unknown>) => {
      if (typeof props.labelFormatter === 'function') {
        capturedAreaTooltipProps.push(props);
      } else {
        capturedPieTooltipProps.push(props);
      }
      return <div data-testid="chart-tooltip" />;
    },
    Legend: (props: Record<string, unknown>) => {
      capturedLegendProps.push(props);
      return <div data-testid="chart-legend" />;
    },
  };
});

function renderLayout(overrides: Partial<Parameters<typeof DashboardSummaryLayout>[0]> = {}) {
  capturedAreaTooltipProps.length = 0;
  capturedPieTooltipProps.length = 0;
  capturedLegendProps.length = 0;

  const accountOptions: DashboardSelectOption[] = [{ value: 'all', label: 'Todas' }];
  const yearOptions: DashboardSelectOption[] = [{ value: '2026', label: '2026' }];
  const monthOptions: DashboardSelectOption[] = [{ value: 'all', label: 'Todos' }];
  const kpis: DashboardKpiItem[] = [
    { title: 'KPI 1', value: '10', trend: '+1', trendClass: 'positive' },
  ];
  const chartData: DashboardChartPoint[] = [
    { month: 'ene', amount: 100, lossAmount: -30, breakevenAmount: 0 },
  ];
  const chartInsights: DashboardInsightItem[] = [
    { title: 'Insight con detalle', value: 'ok', detail: 'detalle' },
    { title: 'Insight sin detalle', value: 'ok' },
  ];
  const distributionData: DashboardDistributionItem[] = [
    { name: 'Ganadas', value: 60, operations: 6, totalAmount: 200, averageAmount: 33.33, color: '#0ea5e9' },
  ];
  const distributionMetrics: DashboardMetricItem[] = [
    { title: 'Profit factor', value: '1.5', valueClass: 'positive' },
    { title: 'Expectativa', value: '0.2R' },
  ];

  const onAccountFilterChange = vi.fn();
  const onYearFilterChange = vi.fn();
  const onMonthFilterChange = vi.fn();

  render(
    <DashboardSummaryLayout
      accountFilterValue="all"
      onAccountFilterChange={onAccountFilterChange}
      accountOptions={accountOptions}
      yearFilterValue="2026"
      onYearFilterChange={onYearFilterChange}
      yearOptions={yearOptions}
      monthFilterValue="all"
      onMonthFilterChange={onMonthFilterChange}
      monthOptions={monthOptions}
      kpis={kpis}
      chartTitle="Evolucion"
      chartData={chartData}
      chartLabelFormatter={(label) => String(label).toUpperCase()}
      amountFormatter={(value) => `${value} USD`}
      distributionAmountFormatter={(value) => `${value.toFixed(2)} USD`}
      chartInsights={chartInsights}
      distributionTitle="Distribucion"
      distributionData={distributionData}
      distributionMetrics={distributionMetrics}
    >
      <div>Contenido hijo</div>
    </DashboardSummaryLayout>
  );

  return {
    onAccountFilterChange,
    onYearFilterChange,
    onMonthFilterChange,
    ...overrides,
  };
}

describe('DashboardSummaryLayout', () => {
  it('abre y cierra panel de filtros y dispara cambios de filtros', () => {
    const { onAccountFilterChange, onYearFilterChange, onMonthFilterChange } = renderLayout();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar u ocultar filtros' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel de filtros' }));

    fireEvent.change(screen.getByLabelText('Filtrar por cuenta'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Filtrar por año'), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText('Filtrar por mes'), { target: { value: 'all' } });

    expect(onAccountFilterChange).toHaveBeenCalledWith('all');
    expect(onYearFilterChange).toHaveBeenCalledWith('2026');
    expect(onMonthFilterChange).toHaveBeenCalledWith('all');
    expect(screen.getByText('Contenido hijo')).toBeInTheDocument();
  });

  it('cubre ramas de formatters de tooltip y legend', () => {
    renderLayout();

    const areaTooltip = capturedAreaTooltipProps[0];
    const areaFormatter = areaTooltip.formatter as (value: number, name: string) => [string, string];
    const pieTooltip = capturedPieTooltipProps[0];
    const pieFormatter = pieTooltip.formatter as (value: number, name: string, props: { payload: DashboardDistributionItem }) => [string, string];
    const legendFormatter = capturedLegendProps[0].formatter as (value: string) => string;

    expect(areaFormatter(10, 'perdidas')).toEqual(['10 USD', 'Perdidas']);
    expect(areaFormatter(0, 'breakeven')).toEqual(['0 USD', 'Breakeven']);
    expect(areaFormatter(25, 'neto')).toEqual(['25 USD', 'Resultado neto (solo ganancias)']);

    expect(
      pieFormatter(60, 'Ganadas', {
        payload: { name: 'Ganadas', value: 60, operations: 6, totalAmount: 200, averageAmount: 33.33, color: '#0ea5e9' },
      })
    ).toEqual(['60.0% · 6 ops · 200.00 USD', 'Ganadas']);

    expect(legendFormatter('Ganadas')).toBe('Ganadas 60.0%');
    expect(legendFormatter('Sin dato')).toBe('Sin dato 0.0%');

    expect(screen.getByText('Insight con detalle')).toBeInTheDocument();
    expect(screen.getByText('detalle')).toBeInTheDocument();
    expect(screen.getByText('Insight sin detalle')).toBeInTheDocument();
  });
});
