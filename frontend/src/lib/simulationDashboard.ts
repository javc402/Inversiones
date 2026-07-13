import { SimulationOperationDraft, summarizeSimulationOperations } from './simulationWorkspace';

export interface SimulationTimelinePoint {
  label: string;
  amount: number;
  lossAmount: number;
  breakevenAmount: number;
}

export interface SimulationDistributionSlice {
  name: 'Exito' | 'SL' | 'Breakeven' | 'No operar';
  value: number;
  operations: number;
  totalAmount: number;
  averageAmount: number;
  color: string;
}

export interface SimulationTradingInsights {
  bestWeekLabel: string;
  bestWeekAmount: number;
  bestDayLabel: string;
  bestDayAmount: number;
  bestWeekdayLabel: string;
  bestWeekdayTotal: number;
  bestWeekdayAverage: number;
  bestWeekdayTrades: number;
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const MONTH_FILTER_LABELS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function appendAmount(point: SimulationTimelinePoint, operation: SimulationOperationDraft): void {
  if (operation.resultType === 'breakeven') {
    point.breakevenAmount = round2(point.breakevenAmount + operation.monetaryResult);
    return;
  }

  if (operation.monetaryResult > 0) {
    point.amount = round2(point.amount + operation.monetaryResult);
    return;
  }

  if (operation.monetaryResult < 0) {
    point.lossAmount = round2(point.lossAmount + operation.monetaryResult);
  }
}

function buildMonthlyTimeline(
  operations: SimulationOperationDraft[],
  referenceYear: number,
): SimulationTimelinePoint[] {
  const points = Array.from({ length: 12 }, (_, index) => ({
    label: MONTH_LABELS[index],
    amount: 0,
    lossAmount: 0,
    breakevenAmount: 0,
  }));

  for (const operation of operations) {
    const date = parseOperationDate(operation.operationDate);
    if (date?.getFullYear() !== referenceYear) {
      continue;
    }

    const point = points[date.getMonth()];
    if (!point) {
      continue;
    }

    appendAmount(point, operation);
  }

  return points;
}

function buildDailyTimeline(
  operations: SimulationOperationDraft[],
  referenceYear: number,
  referenceMonth: number,
): SimulationTimelinePoint[] {
  const daysInMonth = new Date(referenceYear, referenceMonth + 1, 0).getDate();
  const points = Array.from({ length: daysInMonth }, (_, index) => ({
    label: String(index + 1),
    amount: 0,
    lossAmount: 0,
    breakevenAmount: 0,
  }));

  for (const operation of operations) {
    const date = parseOperationDate(operation.operationDate);
    if (date?.getFullYear() !== referenceYear || date.getMonth() !== referenceMonth) {
      continue;
    }

    const point = points[date.getDate() - 1];
    if (!point) {
      continue;
    }

    appendAmount(point, operation);
  }

  return points;
}

function parseOperationDate(value: string): Date | null {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function emptyInsights(): SimulationTradingInsights {
  return {
    bestWeekLabel: 'Sin datos',
    bestWeekAmount: 0,
    bestDayLabel: 'Sin datos',
    bestDayAmount: 0,
    bestWeekdayLabel: 'Sin datos',
    bestWeekdayTotal: 0,
    bestWeekdayAverage: 0,
    bestWeekdayTrades: 0,
  };
}

function weekOfPeriod(date: Date, mode: 'month' | 'year'): number {
  if (mode === 'year') {
    return Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  }

  return Math.floor((date.getDate() - 1) / 7) + 1;
}

function dayKeyOfPeriod(date: Date, mode: 'month' | 'year'): string {
  if (mode === 'year') {
    return `${date.getMonth() + 1}-${date.getDate()}`;
  }

  return String(date.getDate());
}

export function getSimulationAvailableYears(operations: SimulationOperationDraft[]): number[] {
  const years = new Set<number>();

  for (const operation of operations) {
    const date = parseOperationDate(operation.operationDate);
    if (date) {
      years.add(date.getFullYear());
    }
  }

  return Array.from(years).sort((left, right) => right - left);
}

export function getSimulationAvailableMonths(operations: SimulationOperationDraft[], selectedYear: string): number[] {
  const months = new Set<number>();

  for (const operation of filterSimulationOperations(operations, selectedYear, 'all')) {
    const date = parseOperationDate(operation.operationDate);
    if (date) {
      months.add(date.getMonth());
    }
  }

  return Array.from(months).sort((left, right) => left - right);
}

export function filterSimulationOperations(
  operations: SimulationOperationDraft[],
  selectedYear: string,
  selectedMonth: string,
): SimulationOperationDraft[] {
  return operations.filter((operation) => {
    const date = parseOperationDate(operation.operationDate);
    if (!date) {
      return false;
    }

    if (selectedYear !== 'all' && date.getFullYear() !== Number.parseInt(selectedYear, 10)) {
      return false;
    }

    if (selectedMonth !== 'all' && date.getMonth() !== Number.parseInt(selectedMonth, 10)) {
      return false;
    }

    return true;
  });
}

export function calculateSimulationTimelineData(
  operations: SimulationOperationDraft[],
  selectedYear: string,
  selectedMonth: string,
): SimulationTimelinePoint[] {
  const filteredOperations = filterSimulationOperations(operations, selectedYear, selectedMonth);
  const years = getSimulationAvailableYears(filteredOperations.length > 0 ? filteredOperations : operations);
  const referenceYear = selectedYear !== 'all'
    ? Number.parseInt(selectedYear, 10)
    : years[0] ?? new Date().getFullYear();

  if (selectedMonth === 'all') {
    return buildMonthlyTimeline(filteredOperations, referenceYear);
  }

  const referenceMonth = Number.parseInt(selectedMonth, 10);
  return buildDailyTimeline(filteredOperations, referenceYear, referenceMonth);
}

export function calculateSimulationDistributionData(operations: SimulationOperationDraft[]): SimulationDistributionSlice[] {
  const summary = summarizeSimulationOperations(operations);
  const total = summary.totalOpportunities || 1;
  const grouped = [
    { name: 'Exito' as const, operations: summary.totalWin, totalAmount: operations.filter((item) => item.resultType === 'win').reduce((sum, item) => sum + item.monetaryResult, 0), color: '#1e5ba8' },
    { name: 'SL' as const, operations: summary.totalSl, totalAmount: operations.filter((item) => item.resultType === 'sl').reduce((sum, item) => sum + item.monetaryResult, 0), color: '#dc2626' },
    { name: 'Breakeven' as const, operations: summary.totalBreakeven, totalAmount: operations.filter((item) => item.resultType === 'breakeven').reduce((sum, item) => sum + item.monetaryResult, 0), color: '#ea580c' },
    { name: 'No operar' as const, operations: summary.totalNoTrade, totalAmount: 0, color: '#7c92ab' },
  ];

  return grouped.map((item) => ({
    ...item,
    value: Number(((item.operations / total) * 100).toFixed(1)),
    totalAmount: round2(item.totalAmount),
    averageAmount: item.operations === 0 ? 0 : round2(item.totalAmount / item.operations),
  }));
}

export function simulationMonthLabel(month: number): string {
  return MONTH_LABELS[month] ?? String(month);
}

export function calculateSimulationWinRate(operations: SimulationOperationDraft[]): number {
  const wins = operations.filter((operation) => operation.resultType === 'win').length;
  const losses = operations.filter((operation) => operation.resultType === 'sl').length;
  const resolved = wins + losses;
  if (resolved === 0) return 0;
  return (wins / resolved) * 100;
}

export function calculateSimulationLossRate(operations: SimulationOperationDraft[]): number {
  const wins = operations.filter((operation) => operation.resultType === 'win').length;
  const losses = operations.filter((operation) => operation.resultType === 'sl').length;
  const resolved = wins + losses;
  if (resolved === 0) return 0;
  return (losses / resolved) * 100;
}

export function calculateSimulationMonetaryWeights(winTotal: number, lossTotal: number): { winWeight: number; lossWeight: number } {
  const grossWin = Math.max(0, winTotal);
  const grossLoss = Math.abs(Math.min(0, lossTotal));
  const total = grossWin + grossLoss;
  if (total === 0) {
    return { winWeight: 0, lossWeight: 0 };
  }

  return {
    winWeight: (grossWin / total) * 100,
    lossWeight: (grossLoss / total) * 100,
  };
}

export function calculateSimulationWinTotal(operations: SimulationOperationDraft[]): number {
  return round2(operations.reduce((sum, operation) => sum + Math.max(operation.monetaryResult, 0), 0));
}

export function calculateSimulationLossTotal(operations: SimulationOperationDraft[]): number {
  return round2(operations.reduce((sum, operation) => operation.monetaryResult < 0 ? sum + operation.monetaryResult : sum, 0));
}

export function calculateSimulationProfitFactor(winTotal: number, lossTotal: number): string {
  const absoluteLoss = Math.abs(lossTotal);
  if (absoluteLoss === 0) {
    return winTotal > 0 ? '∞' : '0.00';
  }

  return (winTotal / absoluteLoss).toFixed(2);
}

export function calculateSimulationWinLossRatio(operations: SimulationOperationDraft[]): string {
  return `${operations.filter((operation) => operation.resultType === 'win').length}:${operations.filter((operation) => operation.resultType === 'sl').length}`;
}

export function calculateSimulationTradingInsights(
  operations: SimulationOperationDraft[],
  mode: 'month' | 'year',
): SimulationTradingInsights {
  const byWeek = new Map<number, number>();
  const byDay = new Map<string, { amount: number; day: number; month: number }>();
  const byWeekday = new Map<number, { total: number; trades: number }>();

  for (const operation of operations) {
    if (operation.resultType === 'no_trade') {
      continue;
    }

    const date = parseOperationDate(operation.operationDate);
    if (!date) {
      continue;
    }

    const amount = operation.monetaryResult;
    const week = weekOfPeriod(date, mode);
    byWeek.set(week, (byWeek.get(week) ?? 0) + amount);

    const dayKey = dayKeyOfPeriod(date, mode);
    const previousDay = byDay.get(dayKey);
    if (!previousDay) {
      byDay.set(dayKey, { amount, day: date.getDate(), month: date.getMonth() });
    } else {
      byDay.set(dayKey, { ...previousDay, amount: previousDay.amount + amount });
    }

    const weekday = date.getDay();
    const previousWeekday = byWeekday.get(weekday) ?? { total: 0, trades: 0 };
    byWeekday.set(weekday, { total: previousWeekday.total + amount, trades: previousWeekday.trades + 1 });
  }

  if (byWeek.size === 0) {
    return emptyInsights();
  }

  const bestWeek = [...byWeek.entries()].reduce<[number, number]>((best, current) => current[1] > best[1] ? current : best, [0, Number.NEGATIVE_INFINITY]);
  const bestDay = [...byDay.values()].reduce<{ amount: number; day: number; month: number }>((best, current) => current.amount > best.amount ? current : best, { amount: Number.NEGATIVE_INFINITY, day: 0, month: 0 });
  const bestWeekday = [...byWeekday.entries()].reduce<[number, { total: number; trades: number }]>((best, current) => {
    const bestAverage = best[1].trades === 0 ? Number.NEGATIVE_INFINITY : best[1].total / best[1].trades;
    const currentAverage = current[1].trades === 0 ? Number.NEGATIVE_INFINITY : current[1].total / current[1].trades;
    return currentAverage > bestAverage ? current : best;
  }, [0, { total: Number.NEGATIVE_INFINITY, trades: 0 }]);

  return {
    bestWeekLabel: `Semana ${bestWeek[0]}`,
    bestWeekAmount: bestWeek[1],
    bestDayLabel: mode === 'year'
      ? `Dia ${String(bestDay.day).padStart(2, '0')} de ${MONTH_FILTER_LABELS[bestDay.month] ?? ''}`
      : `Dia ${String(bestDay.day).padStart(2, '0')}`,
    bestDayAmount: bestDay.amount,
    bestWeekdayLabel: WEEKDAY_LABELS[bestWeekday[0]] ?? 'Sin datos',
    bestWeekdayTotal: bestWeekday[1].trades === 0 ? 0 : bestWeekday[1].total,
    bestWeekdayAverage: bestWeekday[1].trades === 0 ? 0 : bestWeekday[1].total / bestWeekday[1].trades,
    bestWeekdayTrades: bestWeekday[1].trades,
  };
}