import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AppIcon } from './AppIcon';
import DashboardSummaryLayout from './DashboardSummaryLayout';
import {
  createSimulationDraft,
  deleteSimulation,
  listSimulationOperations,
  listSimulations,
  replaceSimulationOperations,
  saveSimulation,
  Simulation,
} from '@services/simulations';
import { listTradingAccounts, TradingAccount } from '@services/accounts';
import { openDatePicker, preventManualDatePasteOrDrop, preventManualDateTyping } from '@lib/dateInputGuards';
import { countSimulationOperableDays, generateSimulationArtifacts } from '@lib/simulationGenerator';
import {
  calculateSimulationLossRate,
  calculateSimulationMonetaryWeights,
  calculateSimulationLossTotal,
  calculateSimulationProfitFactor,
  calculateSimulationDistributionData,
  calculateSimulationTimelineData,
  calculateSimulationTradingInsights,
  calculateSimulationWinLossRatio,
  calculateSimulationWinRate,
  calculateSimulationWinTotal,
  filterSimulationOperations,
  getSimulationAvailableMonths,
  getSimulationAvailableYears,
  simulationMonthLabel,
} from '@lib/simulationDashboard';
import {
  createSimulationOperationDrafts,
  normalizeSimulationOperationDraft,
  parseSimulationSide,
  type SimulationOperationDraft,
  summarizeSimulationOperations,
  toSimulationOperationInputs,
} from '@lib/simulationWorkspace';
import '../styles/simulations-module.css';

interface SimulationsModuleProps {
  userEmail: string;
}

type WizardStep = 1 | 2 | 3 | 4;
type AccountMode = 'existing' | 'new';
type SimulationWeekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

type SimulationDraftForm = {
  simulationName: string;
  accountMode: AccountMode;
  selectedAccountId: string;
  accountName: string;
  initialBalance: string;
  currency: string;
  startDate: string;
  endDate: string;
  weekdays: SimulationWeekday[];
  maxOperationsPerDay: string;
  riskPctMin: string;
  riskPctMax: string;
  pctWin: string;
  pctSl: string;
  pctBreakeven: string;
  pctNoTrade: string;
};

type EditableOperationField = 'operationDate' | 'operationTime' | 'side' | 'investedAmount' | 'technicalResultR';
type EditingCell = { operationId: string; field: EditableOperationField } | null;

type NewOperationForm = {
  operationDate: string;
  operationTime: string;
  side: SimulationOperationDraft['side'];
  resultType: SimulationOperationDraft['resultType'];
  technicalResultR: string;
};

type SimulationGroupedWeek = {
  key: string;
  label: string;
  operations: Array<{ operation: SimulationOperationDraft; index: number }>;
};

type SimulationGroupedMonth = {
  key: string;
  label: string;
  weeks: SimulationGroupedWeek[];
};

type SimulationGroupedYear = {
  key: string;
  label: string;
  months: SimulationGroupedMonth[];
};

const WEEKDAY_OPTIONS: Array<{ value: SimulationWeekday; label: string }> = [
  { value: 'mon', label: 'L' },
  { value: 'tue', label: 'M' },
  { value: 'wed', label: 'X' },
  { value: 'thu', label: 'J' },
  { value: 'fri', label: 'V' },
  { value: 'sat', label: 'S' },
  { value: 'sun', label: 'D' },
];

const defaultSimulationDraftForm: SimulationDraftForm = {
  simulationName: '',
  accountMode: 'existing',
  selectedAccountId: '',
  accountName: '',
  initialBalance: '',
  currency: 'USD',
  startDate: '',
  endDate: '',
  weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
  maxOperationsPerDay: '4',
  riskPctMin: '0.06',
  riskPctMax: '0.06',
  pctWin: '40',
  pctSl: '30',
  pctBreakeven: '20',
  pctNoTrade: '10',
};

const wizardStepTitle: Record<WizardStep, string> = {
  1: 'Cuenta base',
  2: 'Rango y días',
  3: 'Riesgo y distribución',
  4: 'Resumen previo',
};

export function formatDateRange(startDate: string, endDate: string): string {
  return `${startDate} .. ${endDate}`;
}

export function statusLabel(status: Simulation['status']): string {
  return status === 'saved' ? 'Guardada' : 'Borrador';
}

export function resultTypeLabel(value: SimulationOperationDraft['resultType']): string {
  if (value === 'win') return 'Exito';
  if (value === 'sl') return 'SL';
  if (value === 'no_trade') return 'No operar';
  return 'Breakeven';
}

export function simulationResultClass(resultType: SimulationOperationDraft['resultType']): 'positive' | 'negative' | 'breakeven' | 'neutral' {
  if (resultType === 'win') return 'positive';
  if (resultType === 'sl') return 'negative';
  if (resultType === 'breakeven') return 'breakeven';
  return 'neutral';
}

export function simulationUsdClass(operation: SimulationOperationDraft): 'positive' | 'negative' | 'breakeven' | 'neutral' {
  if (operation.resultType === 'no_trade') return 'neutral';
  if (operation.monetaryResult > 0) return 'positive';
  if (operation.monetaryResult < 0) return 'negative';
  return 'breakeven';
}

export function applyOperationDerivedValues(operation: SimulationOperationDraft): SimulationOperationDraft {
  const technical = operation.technicalResultR;
  const computedResultType: SimulationOperationDraft['resultType'] = operation.side === null
    ? 'no_trade'
    : (technical === null ? 'breakeven' : technical === 1 ? 'breakeven' : technical > 1 ? 'win' : technical < 0 ? 'sl' : 'breakeven');

  const normalizedInvested = Number.isFinite(operation.investedAmount) ? Math.max(0, operation.investedAmount) : 0;

  if (computedResultType === 'no_trade') {
    return normalizeSimulationOperationDraft({
      ...operation,
      resultType: 'no_trade',
      investedAmount: 0,
      technicalResultR: null,
      monetaryResult: 0,
    });
  }

  const technicalValue = computedResultType === 'breakeven' ? 1 : (technical ?? 0);

  return normalizeSimulationOperationDraft({
    ...operation,
    resultType: computedResultType,
    investedAmount: normalizedInvested,
    monetaryResult: round2(normalizedInvested * technicalValue),
  });
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function distributionAmountLabel(value: number, currency: string): string {
  if (value > 0) return `+${formatMoney(value, currency)}`;
  if (value < 0) return `-${formatMoney(Math.abs(value), currency)}`;
  return formatMoney(0, currency);
}

export function resolveAccountDisplayName(account: TradingAccount): string {
  return account.alias?.trim() || account.name;
}

export function shouldAskDiscardConfirmation(activeSimulation: Simulation | null, hasUnsavedChanges: boolean): boolean {
  return activeSimulation !== null && hasUnsavedChanges;
}

export function applySelectedAccountToForm(prev: SimulationDraftForm, account: TradingAccount): SimulationDraftForm {
  return {
    ...prev,
    accountName: resolveAccountDisplayName(account),
    initialBalance: String(account.initial_balance),
    currency: account.base_currency,
  };
}

export function toggleWeekdaySelection(weekdays: SimulationWeekday[], weekday: SimulationWeekday): SimulationWeekday[] {
  return weekdays.includes(weekday) ? weekdays.filter((item) => item !== weekday) : [...weekdays, weekday];
}

function toNumber(value: string): number {
  return Number.parseFloat(value);
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export function normalizeOperationTimeValue(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2}):(\d{2})/);
  if (!match) return '09:00';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return '09:00';
  return `${match[1]}:${match[2]}`;
}

export function weekOfMonth(day: number): number {
  return Math.floor((day - 1) / 7) + 1;
}

export function fullMonthLabel(month: number): string {
  const date = new Date(2026, month, 1);
  const monthName = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(date);
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

export function compareOperationsByDateTime(left: SimulationOperationDraft, right: SimulationOperationDraft): number {
  if (left.operationDate !== right.operationDate) {
    return left.operationDate.localeCompare(right.operationDate);
  }

  const leftTime = normalizeOperationTimeValue(left.operationTime ?? '09:00');
  const rightTime = normalizeOperationTimeValue(right.operationTime ?? '09:00');
  if (leftTime !== rightTime) {
    return leftTime.localeCompare(rightTime);
  }

  if (left.operationIndex !== right.operationIndex) {
    return left.operationIndex - right.operationIndex;
  }

  return left.id.localeCompare(right.id);
}

export function sortAndReindexOperations(operations: SimulationOperationDraft[]): SimulationOperationDraft[] {
  const sorted = [...operations].sort(compareOperationsByDateTime);
  const countersByDate = new Map<string, number>();

  return sorted.map((operation) => {
    const current = countersByDate.get(operation.operationDate) ?? 0;
    const nextIndex = current + 1;
    countersByDate.set(operation.operationDate, nextIndex);

    if (operation.operationIndex === nextIndex && normalizeOperationTimeValue(operation.operationTime ?? '09:00') === operation.operationTime) {
      return operation;
    }

    return {
      ...operation,
      operationIndex: nextIndex,
      operationTime: normalizeOperationTimeValue(operation.operationTime ?? '09:00'),
    };
  });
}

export function formatPercentRange(min: string, max: string): string {
  return `${min || '0'} - ${max || '0'}`;
}

export function calculateOperationRiskSnapshots(initialBalance: number, operations: SimulationOperationDraft[]): Array<{ balanceBefore: number; balanceAfter: number; investedAmountDisplay: number }> {
  let runningBalance = initialBalance;

  return operations.map((operation) => {
    const balanceBefore = runningBalance;
    const balanceAfter = Math.max(0, runningBalance + operation.monetaryResult);
    runningBalance = balanceAfter;

    return {
      balanceBefore,
      balanceAfter,
      investedAmountDisplay: operation.investedAmount,
    };
  });
}

export function validateStepOne(form: SimulationDraftForm): string {
  if (!form.simulationName.trim()) return 'El nombre de la simulación es obligatorio.';

  if (form.accountMode === 'existing') {
    return form.selectedAccountId ? '' : 'Debes seleccionar una cuenta existente.';
  }

  if (!form.accountName.trim()) return 'El nombre de la cuenta es obligatorio.';
  if (!Number.isFinite(toNumber(form.initialBalance)) || toNumber(form.initialBalance) <= 0) {
    return 'El capital inicial debe ser mayor a 0.';
  }

  return '';
}

export function validateStepTwo(form: SimulationDraftForm): string {
  if (!form.startDate) return 'La fecha de inicio es obligatoria.';
  if (!form.endDate) return 'La fecha de fin es obligatoria.';
  if (form.startDate > form.endDate) return 'La fecha de inicio no puede ser mayor que la fecha de fin.';
  if (form.weekdays.length === 0) return 'Debes seleccionar al menos un día de operación.';
  return '';
}

export function validateStepThree(form: SimulationDraftForm): string {
  const maxOperations = Number.parseInt(form.maxOperationsPerDay, 10);
  if (!Number.isInteger(maxOperations) || maxOperations <= 0) {
    return 'El máximo de operaciones por día debe ser un entero mayor a 0.';
  }

  const riskPctMin = toNumber(form.riskPctMin);
  const riskPctMax = toNumber(form.riskPctMax);
  if (!Number.isFinite(riskPctMin) || !Number.isFinite(riskPctMax) || riskPctMin < 0 || riskPctMax < 0 || riskPctMin > 1 || riskPctMax > 1) {
    return 'El riesgo por operación debe estar entre 0 y 1.';
  }

  if (riskPctMin > riskPctMax) {
    return 'El riesgo mínimo por operación no puede ser mayor que el máximo.';
  }

  const percentages = [toNumber(form.pctWin), toNumber(form.pctSl), toNumber(form.pctBreakeven), toNumber(form.pctNoTrade)];
  if (percentages.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
    return 'Los porcentajes deben estar entre 0 y 100.';
  }

  const total = Number((percentages[0] + percentages[1] + percentages[2] + percentages[3]).toFixed(3));
  return total === 100 ? '' : 'La suma de Exito, SL, Breakeven y No operar debe ser exactamente 100.';
}

export function validateStep(step: WizardStep, form: SimulationDraftForm): string {
  if (step === 1) return validateStepOne(form);
  if (step === 2) return validateStepTwo(form);
  if (step === 3) return validateStepThree(form);
  return '';
}

export default function SimulationsModule({ userEmail }: Readonly<SimulationsModuleProps>) { // NOSONAR
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [wizardError, setWizardError] = useState('');
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState('');
  const [form, setForm] = useState<SimulationDraftForm>(defaultSimulationDraftForm);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');
  const [activeSimulation, setActiveSimulation] = useState<Simulation | null>(null);
  const [activeOperations, setActiveOperations] = useState<SimulationOperationDraft[]>([]);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});
  const [isNewOperationModalOpen, setIsNewOperationModalOpen] = useState(false);
  const [newOperationError, setNewOperationError] = useState('');
  const [newOperationForm, setNewOperationForm] = useState<NewOperationForm>({
    operationDate: '',
    operationTime: '09:00',
    side: 'buy',
    resultType: 'win',
    technicalResultR: '1.5',
  });
  const wizardModalRef = useRef<HTMLDivElement | null>(null);
  const newOperationModalRef = useRef<HTMLDivElement | null>(null);
  const workspaceTopRef = useRef<HTMLElement | null>(null);
  const [isWorkspaceTopCompact, setIsWorkspaceTopCompact] = useState(false);

  useEffect(() => {
    const workspaceVisible = Boolean(activeSimulation || isLoadingWorkspace || workspaceError);
    if (!workspaceVisible) {
      setIsWorkspaceTopCompact(false);
      return;
    }

    const workspaceTopElement = workspaceTopRef.current;
    if (!workspaceTopElement) return;

    const readStickyTop = (): number => {
      const stickyTopVar = getComputedStyle(workspaceTopElement).getPropertyValue('--simulation-sticky-top').trim();
      const stickyTopValue = Number.parseFloat(stickyTopVar.replace('px', ''));
      return Number.isFinite(stickyTopValue) ? stickyTopValue : 0;
    };

    const scrollRoot = workspaceTopElement.closest('.dashboard-layout');
    const scrollingElement = scrollRoot instanceof HTMLElement ? scrollRoot : document.documentElement;
    const rootRect = scrollRoot instanceof HTMLElement ? scrollRoot.getBoundingClientRect() : { top: 0 };

    // Punto absoluto dentro del scroll container donde comienza la cabecera.
    const initialTopInScroll = workspaceTopElement.getBoundingClientRect().top - rootRect.top + scrollingElement.scrollTop;

    const updateCompactHeaderState = () => {
      const stickyTop = readStickyTop();
      const compactTrigger = Math.max(0, initialTopInScroll - stickyTop);
      const isCompact = scrollingElement.scrollTop >= compactTrigger + 2;
      setIsWorkspaceTopCompact((previousValue) => (previousValue === isCompact ? previousValue : isCompact));
    };

    updateCompactHeaderState();
    scrollingElement.addEventListener('scroll', updateCompactHeaderState, { passive: true });
    window.addEventListener('resize', updateCompactHeaderState);

    return () => {
      scrollingElement.removeEventListener('scroll', updateCompactHeaderState);
      window.removeEventListener('resize', updateCompactHeaderState);
    };
  }, [activeSimulation, isLoadingWorkspace, workspaceError]);

  useEffect(() => {
    let cancelled = false;

    async function loadSimulations() {
      setIsLoading(true);
      setError('');

      try {
        const rows = await listSimulations();
        if (!cancelled) {
          setSimulations(rows);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las simulaciones.');
          setSimulations([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSimulations();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const selectedAccount = form.accountMode === 'existing'
      ? accounts.find((account) => account.id === form.selectedAccountId)
      : undefined;
    if (!selectedAccount) {
      return;
    }

    setForm((prev) => applySelectedAccountToForm(prev, selectedAccount));
  }, [accounts, form.accountMode, form.selectedAccountId]);

  const operableDays = useMemo(() => countSimulationOperableDays(form.startDate, form.endDate, form.weekdays), [form.endDate, form.startDate, form.weekdays]);
  const maxDailyOperations = Number.parseInt(form.maxOperationsPerDay, 10);
  const maxOpportunities = Number.isInteger(maxDailyOperations) && maxDailyOperations > 0 ? operableDays * maxDailyOperations : 0;
  const availableYears = useMemo(() => getSimulationAvailableYears(activeOperations), [activeOperations]);
  const availableMonths = useMemo(() => getSimulationAvailableMonths(activeOperations, selectedYear), [activeOperations, selectedYear]);
  const filteredActiveOperations = useMemo(() => filterSimulationOperations(activeOperations, selectedYear, selectedMonth), [activeOperations, selectedMonth, selectedYear]);
  const filteredMetrics = useMemo(() => summarizeSimulationOperations(filteredActiveOperations), [filteredActiveOperations]);
  const timelineData = useMemo(() => calculateSimulationTimelineData(activeOperations, selectedYear, selectedMonth), [activeOperations, selectedMonth, selectedYear]);
  const distributionData = useMemo(() => calculateSimulationDistributionData(filteredActiveOperations), [filteredActiveOperations]);
  const simulationWinRate = useMemo(() => calculateSimulationWinRate(filteredActiveOperations), [filteredActiveOperations]);
  const simulationLossRate = useMemo(() => calculateSimulationLossRate(filteredActiveOperations), [filteredActiveOperations]);
  const simulationWinTotal = useMemo(() => calculateSimulationWinTotal(filteredActiveOperations), [filteredActiveOperations]);
  const simulationLossTotal = useMemo(() => calculateSimulationLossTotal(filteredActiveOperations), [filteredActiveOperations]);
  const simulationMonetaryWeights = useMemo(
    () => calculateSimulationMonetaryWeights(simulationWinTotal, simulationLossTotal),
    [simulationLossTotal, simulationWinTotal],
  );
  const simulationProfitFactor = useMemo(() => calculateSimulationProfitFactor(simulationWinTotal, simulationLossTotal), [simulationLossTotal, simulationWinTotal]);
  const simulationWinLossRatio = useMemo(() => calculateSimulationWinLossRatio(filteredActiveOperations), [filteredActiveOperations]);
  const simulationFinancialNet = useMemo(() => simulationWinTotal + simulationLossTotal, [simulationLossTotal, simulationWinTotal]);
  const simulationInsights = useMemo(
    () => calculateSimulationTradingInsights(filteredActiveOperations, selectedMonth === 'all' ? 'year' : 'month'),
    [filteredActiveOperations, selectedMonth],
  );
  const operationRiskSnapshots = useMemo(() => {
    if (!activeSimulation) {
      return [];
    }

    return calculateOperationRiskSnapshots(activeSimulation.initialBalance, activeOperations);
  }, [activeOperations, activeSimulation]);

  const simulationFinalBalance = useMemo(() => {
    if (!activeSimulation) return 0;
    const lastSnapshot = operationRiskSnapshots[operationRiskSnapshots.length - 1];
    return lastSnapshot ? lastSnapshot.balanceAfter : activeSimulation.initialBalance;
  }, [activeSimulation, operationRiskSnapshots]);

  const newOperationPreview = useMemo(() => {
    if (!activeSimulation) {
      return null;
    }

    if (!newOperationForm.operationDate) {
      return null;
    }

    const operationTime = normalizeOperationTimeValue(newOperationForm.operationTime || '09:00');
    const resultType = newOperationForm.resultType;
    const side = resultType === 'no_trade' ? null : newOperationForm.side;

    if (resultType !== 'no_trade' && side === null) {
      return null;
    }

    let technicalResultR: number | null = null;
    if (resultType === 'sl') {
      technicalResultR = -1;
    } else if (resultType === 'breakeven') {
      technicalResultR = 1;
    } else if (resultType === 'win') {
      const parsed = Number.parseFloat(newOperationForm.technicalResultR);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
      }
      technicalResultR = parsed;
    }

    const baseOperation: SimulationOperationDraft = {
      id: '__new_operation_preview__',
      operationDate: newOperationForm.operationDate,
      operationTime,
      operationIndex: 1,
      side,
      resultType,
      investedAmount: 0,
      technicalResultR,
      monetaryResult: 0,
      note: '',
      isManualEdit: true,
    };

    const withNewOperation = sortAndReindexOperations([...activeOperations, baseOperation]);
    const insertIndex = withNewOperation.findIndex((operation) => operation.id === baseOperation.id);

    let balanceBefore = activeSimulation.initialBalance;
    for (let index = 0; index < insertIndex; index += 1) {
      balanceBefore = Math.max(0, round2(balanceBefore + withNewOperation[index].monetaryResult));
    }

    const riskPct = Math.max(0, Math.min(1, ((activeSimulation.riskPctMin ?? 0.01) + (activeSimulation.riskPctMax ?? 0.01)) / 2));
    const autoInvested = resultType === 'no_trade' ? 0 : round2(Math.min(balanceBefore, balanceBefore * riskPct));
    const finalizedOperation = applyOperationDerivedValues({
      ...withNewOperation[insertIndex],
      investedAmount: autoInvested,
      technicalResultR,
      side,
      resultType,
      isManualEdit: true,
    });

    const orderedOperations = withNewOperation.map((operation, index) => (index === insertIndex ? finalizedOperation : operation));
    const balanceAfter = Math.max(0, round2(balanceBefore + finalizedOperation.monetaryResult));

    return {
      operation: finalizedOperation,
      orderedOperations,
      balanceBefore,
      balanceAfter,
      autoInvested,
      resultClass: simulationResultClass(finalizedOperation.resultType),
      monetaryClass: simulationUsdClass(finalizedOperation),
    };
  }, [activeOperations, activeSimulation, newOperationForm]);

  const hasNewOperationDateTimeCollision = useMemo(() => {
    if (!newOperationForm.operationDate) {
      return false;
    }

    const nextTime = normalizeOperationTimeValue(newOperationForm.operationTime || '09:00');
    return activeOperations.some(
      (operation) => operation.operationDate === newOperationForm.operationDate
        && normalizeOperationTimeValue(operation.operationTime ?? '09:00') === nextTime
    );
  }, [activeOperations, newOperationForm.operationDate, newOperationForm.operationTime]);
  const activeOperationIndexById = useMemo(() => {
    const mapping = new Map<string, number>();
    activeOperations.forEach((operation, index) => {
      mapping.set(operation.id, index);
    });
    return mapping;
  }, [activeOperations]);

  const groupedOperations = useMemo<SimulationGroupedYear[]>(() => {
    const yearsMap = new Map<number, Map<number, Map<number, Array<{ operation: SimulationOperationDraft; index: number }>>>>();

    filteredActiveOperations.forEach((operation) => {
      const index = activeOperationIndexById.get(operation.id);
      if (index === undefined) {
        return;
      }

      const parsed = new Date(`${operation.operationDate}T12:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        return;
      }

      const year = parsed.getFullYear();
      const month = parsed.getMonth();
      const week = weekOfMonth(parsed.getDate());

      let monthsMap = yearsMap.get(year);
      if (!monthsMap) {
        monthsMap = new Map();
        yearsMap.set(year, monthsMap);
      }

      let weeksMap = monthsMap.get(month);
      if (!weeksMap) {
        weeksMap = new Map();
        monthsMap.set(month, weeksMap);
      }

      const bucket = weeksMap.get(week) ?? [];
      bucket.push({ operation, index });
      weeksMap.set(week, bucket);
    });

    return Array.from(yearsMap.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([year, monthsMap]) => ({
        key: `year-${year}`,
        label: String(year),
        months: Array.from(monthsMap.entries())
          .sort((left, right) => left[0] - right[0])
          .map(([month, weeksMap]) => ({
            key: `year-${year}-month-${month}`,
            label: fullMonthLabel(month),
            weeks: Array.from(weeksMap.entries())
              .sort((left, right) => left[0] - right[0])
              .map(([week, operations]) => ({
                key: `year-${year}-month-${month}-week-${week}`,
                label: `Semana ${week}`,
                operations,
              })),
          })),
      }));
  }, [activeOperationIndexById, filteredActiveOperations]);
  const isWorkspaceVisible = Boolean(activeSimulation || isLoadingWorkspace || workspaceError);

  useEffect(() => {
    setExpandedYears((prev) => {
      const next = { ...prev };
      groupedOperations.forEach((year) => {
        if (next[year.key] === undefined) {
          next[year.key] = false;
        }
      });
      return next;
    });

    setExpandedMonths((prev) => {
      const next = { ...prev };
      groupedOperations.forEach((year) => {
        year.months.forEach((month) => {
          if (next[month.key] === undefined) {
            next[month.key] = false;
          }
        });
      });
      return next;
    });

    setExpandedWeeks((prev) => {
      const next = { ...prev };
      groupedOperations.forEach((year) => {
        year.months.forEach((month) => {
          month.weeks.forEach((week) => {
            if (next[week.key] === undefined) {
              next[week.key] = false;
            }
          });
        });
      });
      return next;
    });
  }, [groupedOperations]);

  useEffect(() => {
    if (selectedMonth === 'all') {
      return;
    }

    const month = Number.parseInt(selectedMonth, 10);
    if (!availableMonths.includes(month)) {
      setSelectedMonth('all');
    }
  }, [availableMonths, selectedMonth]);

  function handleYearFilterChange(value: string) {
    setSelectedYear(value);
    if (value === 'all') {
      setSelectedMonth('all');
    }
  }

  function handleMonthFilterChange(value: string) {
    setSelectedMonth(value);
  }

  useEffect(() => {
    if (!isWizardOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeWizard();
      }
    }

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (wizardModalRef.current?.contains(target)) {
        return;
      }

      closeWizard();
    }

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isWizardOpen]);

  useEffect(() => {
    if (!isNewOperationModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeNewOperationModal();
      }
    }

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (newOperationModalRef.current?.contains(target)) {
        return;
      }

      closeNewOperationModal();
    }

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isNewOperationModalOpen]);

  function confirmDiscardCurrentWorkspace(): boolean {
    return !shouldAskDiscardConfirmation(activeSimulation, hasUnsavedChanges)
      || (globalThis.window?.confirm('Se perderán los cambios no guardados de la simulación actual. ¿Deseas continuar?') ?? true);
  }

  async function openWizard() {
    if (!confirmDiscardCurrentWorkspace()) {
      return;
    }

    setIsWizardOpen(true);
    setWizardStep(1);
    setWizardError('');
    setAccountsError('');
    setGenerationMessage('');
    setForm(defaultSimulationDraftForm);
    setIsLoadingAccounts(true);

    try {
      const rows = await listTradingAccounts();
      setAccounts(rows);
      if (rows.length === 0) {
        setForm((prev) => ({ ...prev, accountMode: 'new' }));
      }
    } catch (loadError) {
      setAccounts([]);
      setAccountsError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las cuentas.');
      setForm((prev) => ({ ...prev, accountMode: 'new' }));
    } finally {
      setIsLoadingAccounts(false);
    }
  }

  function closeWizard() {
    setIsWizardOpen(false);
    setWizardStep(1);
    setWizardError('');
    setAccountsError('');
    setForm(defaultSimulationDraftForm);
  }

  async function openSimulationWorkspace(simulation: Simulation) {
    if (!confirmDiscardCurrentWorkspace()) {
      return;
    }

    setWorkspaceError('');
    setIsLoadingWorkspace(true);

    try {
      const operations = await listSimulationOperations(simulation.id);
      setActiveSimulation(simulation);
      setActiveOperations(createSimulationOperationDrafts(operations));
      setSelectedYear('all');
      setSelectedMonth('all');
      setHasUnsavedChanges(false);
    } catch (loadError) {
      setWorkspaceError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las operaciones de la simulación.');
    } finally {
      setIsLoadingWorkspace(false);
    }
  }

  async function handleDeleteSimulation(simulation: Simulation) {
    const confirmed = globalThis.window?.confirm(`¿Eliminar la simulación "${simulation.name}"? Esta acción no se puede deshacer.`) ?? false;
    if (!confirmed) {
      return;
    }

    try {
      await deleteSimulation(simulation.id);
      setSimulations((prev) => prev.filter((item) => item.id !== simulation.id));

      if (activeSimulation?.id === simulation.id) {
        setActiveSimulation(null);
        setActiveOperations([]);
        setHasUnsavedChanges(false);
        setWorkspaceError('');
        setSelectedYear('all');
        setSelectedMonth('all');
      }

      if (generationMessage) {
        setGenerationMessage('');
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la simulación.');
    }
  }

  function closeSimulationWorkspace() {
    setActiveSimulation(null);
    setActiveOperations([]);
    setWorkspaceError('');
    setHasUnsavedChanges(false);
    setIsNewOperationModalOpen(false);
    setNewOperationError('');
    setSelectedYear('all');
    setSelectedMonth('all');
  }

  function handleBackToSimulationsList() {
    if (!confirmDiscardCurrentWorkspace()) {
      return;
    }

    closeSimulationWorkspace();
  }

  function handleOperationChange(operationId: string, patch: Partial<SimulationOperationDraft>, maxInvested?: number) {
    setActiveOperations((prev) => {
      const nextOperations = prev.map((operation) => {
        if (operation.id !== operationId) {
          return operation;
        }

        const nextInvestedRaw = patch.investedAmount ?? operation.investedAmount;
        const nextInvested = Number.isFinite(nextInvestedRaw)
          ? Math.max(0, maxInvested === undefined ? nextInvestedRaw : Math.min(nextInvestedRaw, maxInvested))
          : 0;

        return applyOperationDerivedValues({
          ...operation,
          ...patch,
          operationTime: patch.operationTime ? normalizeOperationTimeValue(patch.operationTime) : operation.operationTime,
          investedAmount: nextInvested,
          isManualEdit: true,
        });
      });

      if (patch.operationDate !== undefined || patch.operationTime !== undefined) {
        return sortAndReindexOperations(nextOperations);
      }

      return nextOperations;
    });
    setHasUnsavedChanges(true);
  }

  function openNewOperationModal() {
    if (!activeSimulation) {
      return;
    }

    const today = activeOperations[activeOperations.length - 1]?.operationDate ?? activeSimulation.startDate;
    const nowTime = activeOperations[activeOperations.length - 1]?.operationTime ?? '09:00';

    setNewOperationForm({
      operationDate: today,
      operationTime: normalizeOperationTimeValue(nowTime),
      side: 'buy',
      resultType: 'win',
      technicalResultR: '1.5',
    });
    setNewOperationError('');
    setIsNewOperationModalOpen(true);
  }

  function closeNewOperationModal() {
    setIsNewOperationModalOpen(false);
    setNewOperationError('');
  }

  function handleCreateNewOperation() {
    if (hasNewOperationDateTimeCollision) {
      setNewOperationError('Ya existe una operación en la misma fecha y hora. Elige otra hora.');
      return;
    }

    if (!newOperationPreview) {
      setNewOperationError('Completa los datos requeridos para calcular la operación.');
      return;
    }

    setActiveOperations(newOperationPreview.orderedOperations);
    setHasUnsavedChanges(true);
    setNewOperationError('');
    setIsNewOperationModalOpen(false);
  }

  function handleDeleteOperation(operationId: string): void {
    const confirmed = globalThis.window?.confirm('¿Eliminar esta operación?') ?? false;
    if (!confirmed) {
      return;
    }

    setActiveOperations((prev) => {
      const remaining = prev.filter((operation) => operation.id !== operationId);
      return sortAndReindexOperations(remaining);
    });

    setEditingCell((prev) => (prev?.operationId === operationId ? null : prev));
    setHasUnsavedChanges(true);
  }

  function toggleYear(key: string): void {
    setExpandedYears((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }

  function toggleMonth(key: string): void {
    setExpandedMonths((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }

  function toggleWeek(key: string): void {
    setExpandedWeeks((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }

  function renderOperationRow(operation: SimulationOperationDraft, index: number) {
    const snapshot = operationRiskSnapshots[index];
    const resultClass = simulationResultClass(operation.resultType);
    const usdClass = simulationUsdClass(operation);
    const maxInvestedForRow = snapshot?.balanceBefore ?? activeSimulation?.initialBalance ?? 0;

    return (
      <tr key={operation.id}>
        <td>
          {isEditingCell(operation.id, 'operationDate') ? (
            <input
              className="simulation-inline-editor"
              type="date"
              aria-label={`Fecha ${operation.operationIndex}`}
              value={operation.operationDate}
              inputMode="none"
              autoFocus
              onFocus={openDatePicker}
              onClick={openDatePicker}
              onKeyDown={(event) => {
                if (event.key === 'Escape' || event.key === 'Enter') {
                  endCellEdit();
                  return;
                }
                preventManualDateTyping(event);
              }}
              onBlur={endCellEdit}
              onPaste={preventManualDatePasteOrDrop}
              onDrop={preventManualDatePasteOrDrop}
              onChange={(event) => handleOperationChange(operation.id, { operationDate: event.target.value })}
            />
          ) : (
            <button
              type="button"
              className="simulation-inline-display"
              aria-label={`Editar fecha ${operation.operationIndex}`}
              onClick={() => beginCellEdit(operation.id, 'operationDate')}
            >
              {formatOperationDateForDisplay(operation.operationDate)}
            </button>
          )}
        </td>
        <td>
          {isEditingCell(operation.id, 'operationTime') ? (
            <input
              className="simulation-inline-editor"
              type="time"
              aria-label={`Hora ${operation.operationIndex}`}
              value={operation.operationTime ?? '09:00'}
              step={300}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Escape' || event.key === 'Enter') {
                  endCellEdit();
                }
              }}
              onBlur={endCellEdit}
              onChange={(event) => handleOperationChange(operation.id, { operationTime: event.target.value })}
            />
          ) : (
            <button
              type="button"
              className="simulation-inline-display"
              aria-label={`Editar hora ${operation.operationIndex}`}
              onClick={() => beginCellEdit(operation.id, 'operationTime')}
            >
              {formatOperationTimeForDisplay(operation.operationTime ?? '09:00')}
            </button>
          )}
        </td>
        <td>
          {operation.resultType === 'no_trade' ? (
            <span className="simulation-inline-static muted">N/A</span>
          ) : isEditingCell(operation.id, 'side') ? (
            <select
              className="simulation-inline-editor"
              aria-label={`Tipo ${operation.operationIndex}`}
              value={operation.side ?? ''}
              autoFocus
              onBlur={endCellEdit}
              onKeyDown={(event) => {
                if (event.key === 'Escape' || event.key === 'Enter') {
                  endCellEdit();
                }
              }}
              onChange={(event) => {
                handleOperationChange(operation.id, { side: parseSimulationSide(event.target.value) });
                endCellEdit();
              }}
            >
              <option value="">N/A</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          ) : (
            <button
              type="button"
              className="simulation-inline-display"
              aria-label={`Editar tipo ${operation.operationIndex}`}
              onClick={() => beginCellEdit(operation.id, 'side')}
            >
              {operationSideLabel(operation.side)}
            </button>
          )}
        </td>
        <td>
          <strong>
            {snapshot ? formatMoney(snapshot.balanceBefore, activeSimulation?.currency ?? 'USD') : formatMoney(activeSimulation?.initialBalance ?? 0, activeSimulation?.currency ?? 'USD')}
          </strong>
        </td>
        <td>
          {operation.resultType === 'no_trade' ? (
            <span className="simulation-inline-static">{formatMoney(0, activeSimulation?.currency ?? 'USD')}</span>
          ) : isEditingCell(operation.id, 'investedAmount') ? (
            <input
              className="simulation-inline-editor"
              type="number"
              aria-label={`Invertido ${operation.operationIndex}`}
              step="0.01"
              min="0"
              max={Number.isFinite(maxInvestedForRow) ? maxInvestedForRow : undefined}
              value={operation.investedAmount}
              autoFocus
              onBlur={endCellEdit}
              onKeyDown={(event) => {
                if (event.key === 'Escape' || event.key === 'Enter') {
                  endCellEdit();
                }
              }}
              onChange={(event) => {
                const parsed = Number.parseFloat(event.target.value || '0');
                handleOperationChange(operation.id, { investedAmount: parsed }, maxInvestedForRow);
              }}
            />
          ) : (
            <button
              type="button"
              className="simulation-inline-display"
              aria-label={`Editar invertido ${operation.operationIndex}`}
              onClick={() => beginCellEdit(operation.id, 'investedAmount')}
            >
              {snapshot ? formatMoney(snapshot.investedAmountDisplay, activeSimulation?.currency ?? 'USD') : formatMoney(operation.investedAmount, activeSimulation?.currency ?? 'USD')}
            </button>
          )}
        </td>
        <td>
          {operation.resultType === 'no_trade' ? (
            <span className="simulation-inline-static muted">-</span>
          ) : isEditingCell(operation.id, 'technicalResultR') ? (
            <input
              className="simulation-inline-editor"
              type="number"
              aria-label={`Tecnico ${operation.operationIndex}`}
              step="0.01"
              value={operation.technicalResultR ?? ''}
              autoFocus
              onBlur={endCellEdit}
              onKeyDown={(event) => {
                if (event.key === 'Escape' || event.key === 'Enter') {
                  endCellEdit();
                }
              }}
              onChange={(event) => handleOperationChange(operation.id, { technicalResultR: event.target.value === '' ? null : Number.parseFloat(event.target.value) })}
            />
          ) : (
            <button
              type="button"
              className="simulation-inline-display"
              aria-label={`Editar tecnico ${operation.operationIndex}`}
              onClick={() => beginCellEdit(operation.id, 'technicalResultR')}
            >
              {operation.technicalResultR ?? ''}
            </button>
          )}
        </td>
        <td className={resultClass}>
          <span className={`simulation-inline-static ${resultClass}`}>
            {resultTypeLabel(operation.resultType)}
          </span>
        </td>
        <td className={usdClass}>
          <span className={`simulation-inline-static ${usdClass}`}>
            {distributionAmountLabel(operation.monetaryResult, activeSimulation?.currency ?? 'USD')}
          </span>
        </td>
        <td>
          <strong>
            {snapshot ? formatMoney(snapshot.balanceAfter, activeSimulation?.currency ?? 'USD') : formatMoney(activeSimulation?.initialBalance ?? 0, activeSimulation?.currency ?? 'USD')}
          </strong>
        </td>
        <td>
          <button
            type="button"
            className="simulation-row-delete-btn"
            aria-label={`Eliminar operación ${operation.operationIndex}`}
            title="Eliminar operación"
            onClick={() => handleDeleteOperation(operation.id)}
          >
            <AppIcon name="delete" />
          </button>
        </td>
      </tr>
    );
  }

  function isEditingCell(operationId: string, field: EditableOperationField): boolean {
    return editingCell?.operationId === operationId && editingCell.field === field;
  }

  function beginCellEdit(operationId: string, field: EditableOperationField): void {
    setEditingCell({ operationId, field });
  }

  function endCellEdit(): void {
    setEditingCell(null);
  }

  function formatOperationDateForDisplay(value: string): string {
    if (!value) return 'Sin fecha';
    const parsed = new Date(`${value}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    const weekday = new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(parsed);
    const dayMonthYear = new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsed);

    const weekdayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${weekdayCapitalized}, ${dayMonthYear}`;
  }

  function formatOperationTimeForDisplay(value: string): string {
    if (!value) return '--:--';
    return value.slice(0, 5);
  }

  function operationSideLabel(side: SimulationOperationDraft['side']): string {
    if (side === 'buy') return 'Buy';
    if (side === 'sell') return 'Sell';
    return 'N/A';
  }

  async function handleSaveActiveSimulation() {
    if (!activeSimulation) {
      return;
    }

    setWorkspaceError('');
    setIsSavingWorkspace(true);

    try {
      const nextMetrics = summarizeSimulationOperations(activeOperations);
      const savedSimulation = await saveSimulation({
        id: activeSimulation.id,
        name: activeSimulation.name,
        sourceAccountId: activeSimulation.sourceAccountId,
        accountName: activeSimulation.accountName,
        initialBalance: activeSimulation.initialBalance,
        currency: activeSimulation.currency,
        startDate: activeSimulation.startDate,
        endDate: activeSimulation.endDate,
        weekdays: activeSimulation.weekdays,
        maxOperationsPerDay: activeSimulation.maxOperationsPerDay,
        riskPctMin: activeSimulation.riskPctMin ?? 0.01,
        riskPctMax: activeSimulation.riskPctMax ?? 0.01,
        pctWin: activeSimulation.pctWin,
        pctSl: activeSimulation.pctSl,
        pctBreakeven: activeSimulation.pctBreakeven,
        pctNoTrade: activeSimulation.pctNoTrade,
        seed: activeSimulation.seed,
        totalOpportunities: nextMetrics.totalOpportunities,
        totalExecuted: nextMetrics.totalExecuted,
        totalWin: nextMetrics.totalWin,
        totalSl: nextMetrics.totalSl,
        totalBreakeven: nextMetrics.totalBreakeven,
        totalNoTrade: nextMetrics.totalNoTrade,
        netResult: nextMetrics.netResult,
        generatedAt: activeSimulation.generatedAt,
      });

      await replaceSimulationOperations(savedSimulation.id, toSimulationOperationInputs(activeOperations));

      setActiveSimulation(savedSimulation);
      setSimulations((prev) => prev.map((simulation) => simulation.id === savedSimulation.id ? savedSimulation : simulation));
      setHasUnsavedChanges(false);
      setGenerationMessage(`Simulación "${savedSimulation.name}" guardada correctamente.`);
    } catch (saveError) {
      setWorkspaceError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la simulación.');
    } finally {
      setIsSavingWorkspace(false);
    }
  }

  function goToNextStep() {
    const validationError = validateStep(wizardStep, form);
    if (validationError) {
      setWizardError(validationError);
      return;
    }

    setWizardError('');
    setWizardStep((prev) => (prev < 4 ? ((prev + 1) as WizardStep) : prev));
  }

  function goToPreviousStep() {
    setWizardError('');
    setWizardStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : prev));
  }

  function toggleWeekday(weekday: SimulationWeekday) {
    setForm((prev) => {
      return {
        ...prev,
        weekdays: toggleWeekdaySelection(prev.weekdays, weekday),
      };
    });
  }

  async function handleGenerateIntent() {
    setWizardError('');
    setGenerationMessage('');
    setIsGenerating(true);

    const seed = Math.abs(Math.trunc(Date.now())) || 1;
    const initialBalance = toNumber(form.initialBalance);
    const maxOperationsPerDay = Number.parseInt(form.maxOperationsPerDay, 10);
    const riskPctMin = toNumber(form.riskPctMin);
    const riskPctMax = toNumber(form.riskPctMax);
    const generation = generateSimulationArtifacts({
      startDate: form.startDate,
      endDate: form.endDate,
      weekdays: form.weekdays,
      maxOperationsPerDay,
      riskPctMin,
      riskPctMax,
      pctWin: toNumber(form.pctWin),
      pctSl: toNumber(form.pctSl),
      pctBreakeven: toNumber(form.pctBreakeven),
      pctNoTrade: toNumber(form.pctNoTrade),
      initialBalance,
      seed,
    });

    let createdSimulation: Simulation | null = null;

    try {
      createdSimulation = await createSimulationDraft({
        name: form.simulationName,
        sourceAccountId: form.accountMode === 'existing' ? form.selectedAccountId : null,
        accountName: form.accountName,
        initialBalance,
        currency: form.currency,
        startDate: form.startDate,
        endDate: form.endDate,
        weekdays: form.weekdays,
        maxOperationsPerDay,
        riskPctMin,
        riskPctMax,
        pctWin: toNumber(form.pctWin),
        pctSl: toNumber(form.pctSl),
        pctBreakeven: toNumber(form.pctBreakeven),
        pctNoTrade: toNumber(form.pctNoTrade),
        seed,
        status: 'draft',
        totalOpportunities: generation.totalOpportunities,
        totalExecuted: generation.totalExecuted,
        totalWin: generation.totalWin,
        totalSl: generation.totalSl,
        totalBreakeven: generation.totalBreakeven,
        totalNoTrade: generation.totalNoTrade,
        netResult: generation.netResult,
        generatedAt: generation.generatedAt,
      });

      await replaceSimulationOperations(createdSimulation.id, generation.operations);

      setSimulations((prev) => [createdSimulation as Simulation, ...prev]);
      setActiveSimulation(createdSimulation);
      setActiveOperations(createSimulationOperationDrafts(generation.operations));
      setSelectedYear('all');
      setSelectedMonth('all');
      setHasUnsavedChanges(false);
      setWorkspaceError('');
      closeWizard();
      setGenerationMessage(`Simulación "${createdSimulation.name}" generada como borrador con ${generation.totalOpportunities} oportunidades.`);
    } catch (generationError) {
      if (createdSimulation) {
        deleteSimulation(createdSimulation.id).catch(() => undefined);
      }

      setWizardError(generationError instanceof Error ? generationError.message : 'No se pudo generar la simulación.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="simulations-module">
      {!isWorkspaceVisible && (
        <header className="simulations-hero">
          <div>
            <p className="simulations-hero-kicker">Escenarios de prueba</p>
            <h2>Simulaciones</h2>
            <p>Gestiona tus simulaciones guardadas y prepara nuevos escenarios sobre cuentas propias para el usuario <strong>{userEmail}</strong>.</p>
          </div>
          <button type="button" className="primary-btn simulations-create-btn" onClick={openWizard} aria-label="Nueva simulación">
            <AppIcon name="simulation" />
            Nueva simulación
          </button>
        </header>
      )}

      {isWizardOpen && (
        <div className="simulations-wizard-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeWizard();
          }
        }}>
          <section className="simulations-wizard" ref={wizardModalRef} role="dialog" aria-modal="true" aria-label="Asistente de creación de simulación">
            <div className="simulations-wizard-header">
              <div>
                <p className="simulations-hero-kicker">Paso {wizardStep} de 4</p>
                <h3>{wizardStepTitle[wizardStep]}</h3>
              </div>
              <button type="button" className="simulations-wizard-close" onClick={closeWizard} aria-label="Cerrar modal de simulación">
                <AppIcon name="close" />
              </button>
            </div>

          {wizardStep === 1 && (
            <div className="simulations-wizard-grid">
              <label className="simulations-wizard-span-2">
                <span>Nombre de la simulación</span>
                <input
                  value={form.simulationName}
                  onChange={(event) => setForm((prev) => ({ ...prev, simulationName: event.target.value }))}
                  placeholder="Ej: Q1 Forex Demo"
                />
              </label>

              <fieldset className="simulations-mode-switch simulations-wizard-span-2">
                <legend>Origen de la cuenta</legend>
                <label>
                  <input
                    type="radio"
                    name="simulation-account-mode"
                    checked={form.accountMode === 'existing'}
                    onChange={() => setForm((prev) => ({ ...prev, accountMode: 'existing' }))}
                    disabled={accounts.length === 0}
                  />
                  <span>Usar cuenta existente</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="simulation-account-mode"
                    checked={form.accountMode === 'new'}
                    onChange={() => setForm((prev) => ({ ...prev, accountMode: 'new', selectedAccountId: '' }))}
                  />
                  <span>Crear cuenta simulada</span>
                </label>
              </fieldset>

              {isLoadingAccounts && <p className="simulations-inline-note simulations-wizard-span-2">Cargando cuentas existentes...</p>}
              {accountsError && <p className="simulations-error simulations-wizard-span-2">{accountsError}</p>}

              {form.accountMode === 'existing' ? (
                <>
                  <label className="simulations-wizard-span-2">
                    <span>Cuenta existente</span>
                    <select
                      value={form.selectedAccountId}
                      onChange={(event) => setForm((prev) => ({ ...prev, selectedAccountId: event.target.value }))}
                      disabled={accounts.length === 0}
                    >
                      <option value="">Selecciona una cuenta</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>{resolveAccountDisplayName(account)}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Nombre de cuenta</span>
                    <input value={form.accountName} readOnly />
                  </label>

                  <label>
                    <span>Capital inicial</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.initialBalance}
                      onChange={(event) => setForm((prev) => ({ ...prev, initialBalance: event.target.value }))}
                    />
                  </label>

                  <label>
                    <span>Moneda</span>
                    <input value={form.currency} readOnly />
                  </label>
                </>
              ) : (
                <>
                  <label className="simulations-wizard-span-2">
                    <span>Nombre de cuenta</span>
                    <input
                      value={form.accountName}
                      onChange={(event) => setForm((prev) => ({ ...prev, accountName: event.target.value }))}
                      placeholder="Ej: Demo Prop Firm"
                    />
                  </label>

                  <label>
                    <span>Capital inicial</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.initialBalance}
                      onChange={(event) => setForm((prev) => ({ ...prev, initialBalance: event.target.value }))}
                    />
                  </label>

                  <label>
                    <span>Moneda</span>
                    <select value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="MXN">MXN</option>
                    </select>
                  </label>
                </>
              )}
            </div>
          )}

          {wizardStep === 2 && (
            <div className="simulations-wizard-grid">
              <label>
                <span>Fecha de inicio</span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  inputMode="none"
                  onFocus={openDatePicker}
                  onClick={openDatePicker}
                  onKeyDown={preventManualDateTyping}
                  onPaste={preventManualDatePasteOrDrop}
                  onDrop={preventManualDatePasteOrDrop}
                />
              </label>

              <label>
                <span>Fecha de fin</span>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                  inputMode="none"
                  onFocus={openDatePicker}
                  onClick={openDatePicker}
                  onKeyDown={preventManualDateTyping}
                  onPaste={preventManualDatePasteOrDrop}
                  onDrop={preventManualDatePasteOrDrop}
                />
              </label>

              <fieldset className="simulations-weekdays simulations-wizard-span-2">
                <legend>Días de operación</legend>
                <div className="simulations-weekday-grid">
                  {WEEKDAY_OPTIONS.map((weekday) => {
                    const isActive = form.weekdays.includes(weekday.value);
                    return (
                      <button
                        key={weekday.value}
                        type="button"
                        className={`simulations-weekday-btn ${isActive ? 'active' : ''}`}
                        onClick={() => toggleWeekday(weekday.value)}
                        aria-pressed={isActive}
                      >
                        {weekday.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="simulations-wizard-grid">
              <label className="simulations-wizard-span-2">
                <span>Máximo de operaciones por día</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.maxOperationsPerDay}
                  onChange={(event) => setForm((prev) => ({ ...prev, maxOperationsPerDay: event.target.value }))}
                />
              </label>

              <label>
                  <span>Riesgo mínimo por operación</span>
                <input
                  type="number"
                    min="0"
                    max="1"
                    step="0.01"
                  value={form.riskPctMin}
                  onChange={(event) => setForm((prev) => ({ ...prev, riskPctMin: event.target.value }))}
                />
              </label>

              <label>
                  <span>Riesgo máximo por operación</span>
                <input
                  type="number"
                    min="0"
                    max="1"
                    step="0.01"
                  value={form.riskPctMax}
                  onChange={(event) => setForm((prev) => ({ ...prev, riskPctMax: event.target.value }))}
                />
              </label>

              <label>
                <span>Exito %</span>
                <input type="number" min="0" max="100" step="0.1" value={form.pctWin} onChange={(event) => setForm((prev) => ({ ...prev, pctWin: event.target.value }))} />
              </label>

              <label>
                <span>SL %</span>
                <input type="number" min="0" max="100" step="0.1" value={form.pctSl} onChange={(event) => setForm((prev) => ({ ...prev, pctSl: event.target.value }))} />
              </label>

              <label>
                <span>Breakeven %</span>
                <input type="number" min="0" max="100" step="0.1" value={form.pctBreakeven} onChange={(event) => setForm((prev) => ({ ...prev, pctBreakeven: event.target.value }))} />
              </label>

              <label>
                <span>No operar %</span>
                <input type="number" min="0" max="100" step="0.1" value={form.pctNoTrade} onChange={(event) => setForm((prev) => ({ ...prev, pctNoTrade: event.target.value }))} />
              </label>

              <p className="simulations-inline-note simulations-wizard-span-2">
                Suma actual: {(toNumber(form.pctWin) + toNumber(form.pctSl) + toNumber(form.pctBreakeven) + toNumber(form.pctNoTrade)).toFixed(1)}%
              </p>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="simulations-summary" aria-label="Resumen previo de la simulación">
              <div className="simulations-summary-grid">
                <article>
                  <span>Simulación</span>
                  <strong>{form.simulationName || 'Sin nombre'}</strong>
                </article>
                <article>
                  <span>Cuenta</span>
                  <strong>{form.accountName || 'Sin definir'}</strong>
                </article>
                <article>
                  <span>Rango</span>
                  <strong>{form.startDate && form.endDate ? formatDateRange(form.startDate, form.endDate) : 'Sin definir'}</strong>
                </article>
                <article>
                  <span>Capital inicial</span>
                  <strong>{form.initialBalance || '0'} {form.currency}</strong>
                </article>
                <article>
                  <span>Días operables</span>
                  <strong>{operableDays}</strong>
                </article>
                <article>
                  <span>Máximo diario</span>
                  <strong>{form.maxOperationsPerDay || '0'}</strong>
                </article>
                <article>
                  <span>Riesgo por operación</span>
                  <strong>{formatPercentRange(form.riskPctMin, form.riskPctMax)}</strong>
                </article>
                <article>
                  <span>Oportunidades máximas</span>
                  <strong>{maxOpportunities}</strong>
                </article>
                <article>
                  <span>Distribución</span>
                  <strong>{form.pctWin}/{form.pctSl}/{form.pctBreakeven}/{form.pctNoTrade}</strong>
                </article>
              </div>
              <p className="simulations-inline-note">Se generará un borrador reproducible usando semilla, distribución configurada y un riesgo fraccional sobre el balance vigente para que el tamaño de cada operación pueda crecer con la cuenta.</p>
            </div>
          )}

          {wizardError && <p className="simulations-error">{wizardError}</p>}

          <div className="simulations-wizard-actions">
            <button type="button" className="secondary-btn" onClick={wizardStep === 1 ? closeWizard : goToPreviousStep} disabled={isGenerating}>
              {wizardStep === 1 ? 'Cancelar' : 'Atrás'}
            </button>

            {wizardStep < 4 ? (
              <button type="button" className="primary-btn" onClick={goToNextStep} disabled={isGenerating}>Siguiente</button>
            ) : (
              <button type="button" className="primary-btn" onClick={() => void handleGenerateIntent()} disabled={isGenerating}>
                {isGenerating ? 'Generando...' : 'Generar simulación'}
              </button>
            )}
          </div>
          </section>
        </div>
      )}

      {generationMessage && <p className="simulations-inline-note">{generationMessage}</p>}

      {isWorkspaceVisible && (
        <section className="simulation-workspace" aria-label="Dashboard de simulación">
          <section ref={workspaceTopRef} className={`simulation-workspace-top${isWorkspaceTopCompact ? ' is-compact' : ''}`}>
            <div className="simulation-workspace-header">
              <div className="simulation-workspace-title-block">
                <p className="simulations-hero-kicker">Simulación activa</p>
                <div className="simulation-title-help" tabIndex={0} aria-label="Información de la simulación">
                  <h3>{activeSimulation?.name ?? 'Cargando simulación'}</h3>
                  {activeSimulation && !isLoadingWorkspace && !workspaceError && (
                    <div className="simulation-info-popover" role="tooltip" aria-label="Resumen de la simulación activa">
                      <div className="simulation-info-row">
                        <span className="simulation-info-label"><AppIcon name="article" />Rango</span>
                        <span className="simulation-info-value">{formatDateRange(activeSimulation.startDate, activeSimulation.endDate)}</span>
                      </div>
                      <div className="simulation-info-row">
                        <span className="simulation-info-label"><AppIcon name="accounts" />Cuenta</span>
                        <span className="simulation-info-value">{activeSimulation.accountName}</span>
                      </div>
                      <div className="simulation-info-row">
                        <span className="simulation-info-label"><AppIcon name="play" />Valor inicial</span>
                        <span className="simulation-info-value">{formatMoney(activeSimulation.initialBalance, activeSimulation.currency)}</span>
                      </div>
                      <div className="simulation-info-row">
                        <span className="simulation-info-label"><AppIcon name="check" />Valor final</span>
                        <span className="simulation-info-value">{formatMoney(simulationFinalBalance, activeSimulation.currency)}</span>
                      </div>
                      <div className="simulation-info-row">
                        <span className="simulation-info-label"><AppIcon name="entry" />Operaciones</span>
                        <span className="simulation-info-value">{filteredMetrics.totalOpportunities} visibles</span>
                      </div>
                    </div>
                  )}
                </div>
                {activeSimulation && (
                  <p className="simulation-workspace-meta-line">
                    {activeSimulation.accountName} · {statusLabel(activeSimulation.status)}
                  </p>
                )}
              </div>
              <div className="simulation-workspace-actions">
                <button type="button" className="secondary-btn" onClick={handleBackToSimulationsList} disabled={isSavingWorkspace || isLoadingWorkspace}>
                  Volver
                </button>
                <button type="button" className="primary-btn" onClick={() => void handleSaveActiveSimulation()} disabled={!activeSimulation || isSavingWorkspace || isLoadingWorkspace || activeOperations.length === 0 || !hasUnsavedChanges}>
                  {isSavingWorkspace ? 'Guardando...' : 'Guardar simulación'}
                </button>
              </div>
            </div>

            {activeSimulation && !isLoadingWorkspace && !workspaceError && (
              <>
                <section className="simulation-workspace-filters" aria-label="Filtros de simulación">
                  <label htmlFor="simulation-top-year-filter" className="dashboard-summary-filter-label">Filtrar por año</label>
                  <select
                    id="simulation-top-year-filter"
                    className="dashboard-summary-filter"
                    value={selectedYear}
                    onChange={(event) => handleYearFilterChange(event.target.value)}
                  >
                    <option value="all">Todos los años</option>
                    {availableYears.map((year) => (
                      <option key={year} value={String(year)}>{year}</option>
                    ))}
                  </select>

                  <label htmlFor="simulation-top-month-filter" className="dashboard-summary-filter-label">Filtrar por mes</label>
                  <select
                    id="simulation-top-month-filter"
                    className="dashboard-summary-filter"
                    value={selectedMonth}
                    onChange={(event) => handleMonthFilterChange(event.target.value)}
                    disabled={selectedYear === 'all'}
                  >
                    <option value="all">Todos los meses</option>
                    {availableMonths.map((month) => (
                      <option key={month} value={String(month)}>{simulationMonthLabel(month)}</option>
                    ))}
                  </select>
                </section>
              </>
            )}
          </section>

          {isNewOperationModalOpen && activeSimulation && (
            <div className="simulation-modal-overlay" role="presentation" onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeNewOperationModal();
              }
            }}>
              <section className="simulation-modal" ref={newOperationModalRef} role="dialog" aria-modal="true" aria-label="Agregar operación">
                <div className="simulation-modal-header">
                  <h3>Nueva operación</h3>
                  <button type="button" className="simulation-modal-close" onClick={closeNewOperationModal} aria-label="Cerrar modal">
                    <AppIcon name="close" />
                  </button>
                </div>

                <div className="simulation-modal-grid">
                  <label>
                    <span>Fecha</span>
                    <input
                      type="date"
                      value={newOperationForm.operationDate}
                      onChange={(event) => setNewOperationForm((prev) => ({ ...prev, operationDate: event.target.value }))}
                      inputMode="none"
                      onFocus={openDatePicker}
                      onClick={openDatePicker}
                      onKeyDown={preventManualDateTyping}
                      onPaste={preventManualDatePasteOrDrop}
                      onDrop={preventManualDatePasteOrDrop}
                    />
                  </label>

                  <label>
                    <span>Hora</span>
                    <input
                      type="time"
                      value={newOperationForm.operationTime}
                      step={300}
                      onChange={(event) => setNewOperationForm((prev) => ({ ...prev, operationTime: event.target.value }))}
                    />
                  </label>

                  <label>
                    <span>Tipo</span>
                    <select
                      value={newOperationForm.side ?? ''}
                      disabled={newOperationForm.resultType === 'no_trade'}
                      onChange={(event) => setNewOperationForm((prev) => ({ ...prev, side: parseSimulationSide(event.target.value) }))}
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </label>

                  <label>
                    <span>Resultado</span>
                    <select
                      value={newOperationForm.resultType}
                      onChange={(event) => {
                        const nextResultType = event.target.value as SimulationOperationDraft['resultType'];
                        setNewOperationForm((prev) => ({
                          ...prev,
                          resultType: nextResultType,
                          side: nextResultType === 'no_trade' ? null : (prev.side ?? 'buy'),
                          technicalResultR: nextResultType === 'sl' ? '-1' : nextResultType === 'breakeven' ? '1' : prev.technicalResultR,
                        }));
                      }}
                    >
                      <option value="win">Exito</option>
                      <option value="sl">SL</option>
                      <option value="breakeven">Breakeven</option>
                      <option value="no_trade">No operar</option>
                    </select>
                  </label>

                  <label className="simulation-modal-span-2">
                    <span>Técnico R</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newOperationForm.technicalResultR}
                      disabled={newOperationForm.resultType !== 'win'}
                      onChange={(event) => setNewOperationForm((prev) => ({ ...prev, technicalResultR: event.target.value }))}
                    />
                  </label>
                </div>

                {newOperationPreview && (
                  <section className="simulation-modal-preview" aria-label="Vista previa de cálculo">
                    <p>
                      <span>Monto invertido (auto)</span>
                      <strong>{formatMoney(newOperationPreview.autoInvested, activeSimulation.currency)}</strong>
                    </p>
                    <p>
                      <span>Resultado monetario</span>
                      <strong className={newOperationPreview.monetaryClass}>{distributionAmountLabel(newOperationPreview.operation.monetaryResult, activeSimulation.currency)}</strong>
                    </p>
                    <p>
                      <span>Saldo final transacción</span>
                      <strong className={newOperationPreview.resultClass}>{formatMoney(newOperationPreview.balanceAfter, activeSimulation.currency)}</strong>
                    </p>
                  </section>
                )}

                {newOperationError && <p className="simulations-error">{newOperationError}</p>}
                {hasNewOperationDateTimeCollision && !newOperationError && (
                  <p className="simulations-error">Ya existe una operación en la misma fecha y hora.</p>
                )}

                <div className="simulation-modal-actions">
                  <button type="button" className="secondary-btn" onClick={closeNewOperationModal}>Cancelar</button>
                  <button type="button" className="primary-btn" onClick={handleCreateNewOperation} disabled={hasNewOperationDateTimeCollision}>Agregar</button>
                </div>
              </section>
            </div>
          )}

          {isLoadingWorkspace && <p className="simulations-loading">Cargando operaciones de la simulación...</p>}
          {workspaceError && <p className="simulations-error">{workspaceError}</p>}

          {activeSimulation && !isLoadingWorkspace && !workspaceError && (
            <>
              <DashboardSummaryLayout
                idPrefix="simulation"
                accountFilterValue={activeSimulation.accountName}
                onAccountFilterChange={() => undefined}
                accountOptions={[{ value: activeSimulation.accountName, label: activeSimulation.accountName }]}
                yearFilterValue={selectedYear}
                onYearFilterChange={handleYearFilterChange}
                yearOptions={[
                  { value: 'all', label: 'Todos los años' },
                  ...availableYears.map((year) => ({ value: String(year), label: String(year) })),
                ]}
                monthFilterValue={selectedMonth}
                onMonthFilterChange={handleMonthFilterChange}
                monthOptions={[
                  { value: 'all', label: 'Todos los meses' },
                  ...availableMonths.map((month) => ({ value: String(month), label: simulationMonthLabel(month) })),
                ]}
                monthFilterDisabled={selectedYear === 'all'}
                hideToolbar
                kpis={[
                  {
                    title: selectedMonth === 'all' ? 'Ganancias del año' : 'Ganancias del mes',
                    value: formatMoney(simulationFinancialNet, activeSimulation.currency),
                    trend: `${filteredMetrics.totalOpportunities} operaciones`,
                    trendClass: simulationFinancialNet >= 0 ? 'positive' : 'negative',
                  },
                  {
                    title: 'Tasa de exito',
                    value: `${simulationWinRate.toFixed(1)}%`,
                    trend: `W/L: ${filteredMetrics.totalWin}/${filteredMetrics.totalSl}`,
                    trendClass: 'positive',
                  },
                  {
                    title: 'Tasa de perdida',
                    value: `${simulationLossRate.toFixed(1)}%`,
                    trend: `W/L: ${filteredMetrics.totalSl}/${filteredMetrics.totalWin}`,
                    trendClass: 'negative',
                  },
                  {
                    title: 'Peso monetario ganado',
                    value: `${simulationMonetaryWeights.winWeight.toFixed(1)}%`,
                    trend: `Vs perdido: ${simulationMonetaryWeights.lossWeight.toFixed(1)}%`,
                    trendClass: simulationMonetaryWeights.winWeight >= simulationMonetaryWeights.lossWeight ? 'positive' : 'negative',
                  },
                  {
                    title: 'Profit Factor',
                    value: simulationProfitFactor,
                    trend: (
                      <>
                        <span className="positive">{formatMoney(simulationWinTotal, activeSimulation.currency)}</span> / <span className="negative">{formatMoney(Math.abs(simulationLossTotal), activeSimulation.currency)}</span>
                      </>
                    ),
                    trendClass: 'neutral',
                  },
                  {
                    title: 'Mejor dia para operar',
                    value: simulationInsights.bestWeekdayLabel,
                    trend: `Total: ${distributionAmountLabel(simulationInsights.bestWeekdayTotal, activeSimulation.currency)}`,
                    trendClass: 'positive',
                  },
                ]}
                chartTitle="Evolucion de ganancias"
                chartData={timelineData.map((item) => ({ month: item.label, amount: item.amount, lossAmount: item.lossAmount, breakevenAmount: item.breakevenAmount }))}
                chartLabelFormatter={(label) => {
                  if (selectedMonth !== 'all') {
                    const monthIndex = Number.parseInt(selectedMonth, 10);
                    return `Dia ${label} de ${fullMonthLabel(monthIndex)}`;
                  }

                  const monthIndex = timelineData.findIndex((item) => item.label === label);
                  return monthIndex >= 0 ? fullMonthLabel(monthIndex) : label;
                }}
                amountFormatter={(value) => formatMoney(value, activeSimulation.currency)}
                distributionAmountFormatter={(value) => distributionAmountLabel(value, activeSimulation.currency)}
                chartInsights={[
                  { title: `Mejor semana del ${selectedMonth === 'all' ? 'año' : 'mes'}`, value: `${simulationInsights.bestWeekLabel} · ${distributionAmountLabel(simulationInsights.bestWeekAmount, activeSimulation.currency)}` },
                  { title: 'Mejor dia para operar', value: `${simulationInsights.bestDayLabel} · ${distributionAmountLabel(simulationInsights.bestDayAmount, activeSimulation.currency)}` },
                  { title: 'Mejor dia para operar', value: `${simulationInsights.bestWeekdayLabel} · ${distributionAmountLabel(simulationInsights.bestWeekdayTotal, activeSimulation.currency)}`, detail: `${simulationInsights.bestWeekdayTrades} operaciones · Promedio ${distributionAmountLabel(simulationInsights.bestWeekdayAverage, activeSimulation.currency)}` },
                ]}
                distributionTitle="Distribucion de operaciones"
                distributionData={distributionData}
                distributionMetrics={[
                  { title: 'Neto del periodo', value: distributionAmountLabel(simulationFinancialNet, activeSimulation.currency), valueClass: simulationFinancialNet >= 0 ? 'positive' : 'negative' },
                  { title: 'Profit Factor', value: simulationProfitFactor },
                  { title: 'Win/Loss ratio', value: simulationWinLossRatio },
                ]}
              >
                <section className="table-card">
                <div className="simulation-operations-header">
                  <h2>Operaciones recientes</h2>
                  <button
                    type="button"
                    className="simulation-add-operation-btn"
                    onClick={openNewOperationModal}
                    disabled={!activeSimulation || isSavingWorkspace || isLoadingWorkspace}
                    aria-label="Agregar nueva operación"
                    title="Agregar nueva operación"
                  >
                    +
                  </button>
                </div>
                <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Tipo</th>
                      <th>Saldo antes de entrar</th>
                      <th>Invertido</th>
                      <th>Técnico R</th>
                      <th>Resultado</th>
                      <th>Resultado monetario</th>
                      <th>Saldo al final</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedOperations.map((year) => {
                      const isYearExpanded = expandedYears[year.key] ?? false;

                      return (
                        <Fragment key={year.key}>
                          <tr key={year.key} className="simulation-group-row simulation-group-row-year">
                            <td colSpan={10}>
                              <button type="button" className="simulation-group-toggle" onClick={() => toggleYear(year.key)}>
                                <AppIcon name={isYearExpanded ? 'chevronDown' : 'chevronRight'} /> {year.label}
                              </button>
                            </td>
                          </tr>

                          {isYearExpanded && year.months.map((month) => {
                            const isMonthExpanded = expandedMonths[month.key] ?? false;

                            return (
                              <Fragment key={month.key}>
                                <tr className="simulation-group-row simulation-group-row-month">
                                  <td colSpan={10}>
                                    <button type="button" className="simulation-group-toggle" onClick={() => toggleMonth(month.key)}>
                                      <AppIcon name={isMonthExpanded ? 'chevronDown' : 'chevronRight'} /> {month.label}
                                    </button>
                                  </td>
                                </tr>

                                {isMonthExpanded && month.weeks.map((week) => {
                                  const isWeekExpanded = expandedWeeks[week.key] ?? false;

                                  return (
                                    <Fragment key={week.key}>
                                      <tr className="simulation-group-row simulation-group-row-week">
                                        <td colSpan={10}>
                                          <button type="button" className="simulation-group-toggle" onClick={() => toggleWeek(week.key)}>
                                            <AppIcon name={isWeekExpanded ? 'chevronDown' : 'chevronRight'} /> {week.label}
                                          </button>
                                        </td>
                                      </tr>

                                      {isWeekExpanded && week.operations.map(({ operation, index }) => renderOperationRow(operation, index))}
                                    </Fragment>
                                  );
                                })}
                              </Fragment>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                </div>

                <p className="simulations-inline-note">
                  {hasUnsavedChanges ? 'Hay cambios pendientes por guardar.' : `Todo sincronizado. Resultado activo: ${resultTypeLabel(activeOperations[0]?.resultType ?? 'breakeven')}.`}
                </p>
                </section>
              </DashboardSummaryLayout>
            </>
          )}
        </section>
      )}

      {isLoading && <p className="simulations-loading">Cargando simulaciones...</p>}
      {error && <p className="simulations-error">{error}</p>}

      {!isWorkspaceVisible && !isLoading && !error && simulations.length === 0 && (
        <section className="simulations-empty">
          <h3>No hay simulaciones guardadas</h3>
          <p>Cuando guardes tu primera simulación aparecerá aquí para reabrirla y seguir editando.</p>
        </section>
      )}

      {!isWorkspaceVisible && !isLoading && !error && simulations.length > 0 && (
        <section className="simulations-grid" aria-label="Lista de simulaciones guardadas">
          {simulations.map((simulation) => (
            <article key={simulation.id} className="simulation-card">
              <div className="simulation-card-topline">
                <span className={`simulation-status-chip simulation-status-${simulation.status}`}>{statusLabel(simulation.status)}</span>
                <span className="simulation-seed">Seed {simulation.seed}</span>
              </div>

              <div className="simulation-card-body">
                <div>
                  <p className="simulation-card-label">Cuenta base</p>
                  <h3>{simulation.name}</h3>
                  <p className="simulation-card-account">{simulation.accountName}</p>
                </div>

                <div className="simulation-card-meta-grid">
                  <div>
                    <span>Rango</span>
                    <strong>{formatDateRange(simulation.startDate, simulation.endDate)}</strong>
                  </div>
                  <div>
                    <span>Max diario</span>
                    <strong>{simulation.maxOperationsPerDay}</strong>
                  </div>
                  <div>
                    <span>Oportunidades</span>
                    <strong>{simulation.totalOpportunities}</strong>
                  </div>
                  <div>
                    <span>Ejecutadas</span>
                    <strong>{simulation.totalExecuted}</strong>
                  </div>
                </div>

                <div className="simulation-card-stats">
                  <span>Exito: {simulation.totalWin}</span>
                  <span>SL: {simulation.totalSl}</span>
                  <span>BE: {simulation.totalBreakeven}</span>
                  <span>No operar: {simulation.totalNoTrade}</span>
                </div>

                <div className="simulation-card-actions">
                  <button
                    type="button"
                    className="icon-btn simulation-card-icon-btn"
                    onClick={() => void openSimulationWorkspace(simulation)}
                    aria-label={`Abrir ${simulation.name}`}
                    title="Abrir simulación"
                  >
                    <AppIcon name="eye" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn simulation-card-icon-btn simulation-card-icon-btn-danger"
                    onClick={() => void handleDeleteSimulation(simulation)}
                    aria-label={`Eliminar ${simulation.name}`}
                    title="Eliminar simulación"
                  >
                    <AppIcon name="delete" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
