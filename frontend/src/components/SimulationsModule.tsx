import { useEffect, useMemo, useRef, useState } from 'react';
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
  parseSimulationResultType,
  parseSimulationSide,
  SimulationOperationDraft,
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

function formatDateRange(startDate: string, endDate: string): string {
  return `${startDate} .. ${endDate}`;
}

function statusLabel(status: Simulation['status']): string {
  return status === 'saved' ? 'Guardada' : 'Borrador';
}

function resultTypeLabel(value: SimulationOperationDraft['resultType']): string {
  if (value === 'win') return 'Exito';
  if (value === 'sl') return 'SL';
  if (value === 'no_trade') return 'No operar';
  return 'Breakeven';
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function distributionAmountLabel(value: number, currency: string): string {
  if (value > 0) return `+${formatMoney(value, currency)}`;
  if (value < 0) return `-${formatMoney(Math.abs(value), currency)}`;
  return formatMoney(0, currency);
}

function resolveAccountDisplayName(account: TradingAccount): string {
  return account.alias?.trim() || account.name;
}

function shouldAskDiscardConfirmation(activeSimulation: Simulation | null, hasUnsavedChanges: boolean): boolean {
  return activeSimulation !== null && hasUnsavedChanges;
}

function applySelectedAccountToForm(prev: SimulationDraftForm, account: TradingAccount): SimulationDraftForm {
  return {
    ...prev,
    accountName: resolveAccountDisplayName(account),
    initialBalance: String(account.initial_balance),
    currency: account.base_currency,
  };
}

function toggleWeekdaySelection(weekdays: SimulationWeekday[], weekday: SimulationWeekday): SimulationWeekday[] {
  return weekdays.includes(weekday) ? weekdays.filter((item) => item !== weekday) : [...weekdays, weekday];
}

function toNumber(value: string): number {
  return Number.parseFloat(value);
}

function formatPercentRange(min: string, max: string): string {
  return `${min || '0'} - ${max || '0'}`;
}

function calculateOperationRiskSnapshots(initialBalance: number, operations: SimulationOperationDraft[]): Array<{ balanceBefore: number; balanceAfter: number; investedAmountDisplay: number }> {
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

function validateStepOne(form: SimulationDraftForm): string {
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

function validateStepTwo(form: SimulationDraftForm): string {
  if (!form.startDate) return 'La fecha de inicio es obligatoria.';
  if (!form.endDate) return 'La fecha de fin es obligatoria.';
  if (form.startDate > form.endDate) return 'La fecha de inicio no puede ser mayor que la fecha de fin.';
  if (form.weekdays.length === 0) return 'Debes seleccionar al menos un día de operación.';
  return '';
}

function validateStepThree(form: SimulationDraftForm): string {
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

function validateStep(step: WizardStep, form: SimulationDraftForm): string {
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
  const wizardModalRef = useRef<HTMLDivElement | null>(null);

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
  const simulationProfitFactor = useMemo(() => calculateSimulationProfitFactor(simulationWinTotal, simulationLossTotal), [simulationLossTotal, simulationWinTotal]);
  const simulationWinLossRatio = useMemo(() => calculateSimulationWinLossRatio(filteredActiveOperations), [filteredActiveOperations]);
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

  function handleOperationChange(operationId: string, patch: Partial<SimulationOperationDraft>) {
    setActiveOperations((prev) => prev.map((operation) => {
      if (operation.id !== operationId) {
        return operation;
      }

      return normalizeSimulationOperationDraft({
        ...operation,
        ...patch,
        isManualEdit: true,
      });
    }));
    setHasUnsavedChanges(true);
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

      {(activeSimulation || isLoadingWorkspace || workspaceError) && (
        <section className="simulation-workspace" aria-label="Dashboard de simulación">
          <div className="simulation-workspace-header">
            <div>
              <p className="simulations-hero-kicker">Simulación activa</p>
              <h3>{activeSimulation?.name ?? 'Cargando simulación'}</h3>
              {activeSimulation && (
                <p>
                  {activeSimulation.accountName} · {statusLabel(activeSimulation.status)} · Seed {activeSimulation.seed}
                </p>
              )}
            </div>
            <div className="simulation-workspace-actions">
              <button type="button" className="secondary-btn" onClick={openWizard} disabled={isSavingWorkspace || isLoadingWorkspace}>
                Nueva simulación
              </button>
              <button type="button" className="primary-btn" onClick={() => void handleSaveActiveSimulation()} disabled={!activeSimulation || isSavingWorkspace || isLoadingWorkspace || activeOperations.length === 0 || !hasUnsavedChanges}>
                {isSavingWorkspace ? 'Guardando...' : 'Guardar simulación'}
              </button>
            </div>
          </div>

          {isLoadingWorkspace && <p className="simulations-loading">Cargando operaciones de la simulación...</p>}
          {workspaceError && <p className="simulations-error">{workspaceError}</p>}

          {activeSimulation && !isLoadingWorkspace && !workspaceError && (
            <>
              <div className="simulation-workspace-meta">
                <span>Rango: <strong>{formatDateRange(activeSimulation.startDate, activeSimulation.endDate)}</strong></span>
                <span>Cuenta: <strong>{activeSimulation.accountName}</strong></span>
                <span>Máximo diario: <strong>{activeSimulation.maxOperationsPerDay}</strong></span>
                <span>Filtro activo: <strong>{filteredMetrics.totalOpportunities} operaciones visibles</strong></span>
              </div>

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
                kpis={[
                  {
                    title: selectedMonth === 'all' ? 'Ganancias del año' : 'Ganancias del mes',
                    value: formatMoney(filteredMetrics.netResult, activeSimulation.currency),
                    trend: `${filteredMetrics.totalOpportunities} operaciones`,
                    trendClass: filteredMetrics.netResult >= 0 ? 'positive' : 'negative',
                  },
                  {
                    title: 'Tasa de exito',
                    value: `${simulationWinRate.toFixed(1)}%`,
                    trend: `Total ganado: ${formatMoney(simulationWinTotal, activeSimulation.currency)}`,
                    trendClass: 'positive',
                  },
                  {
                    title: 'Tasa de perdida',
                    value: `${simulationLossRate.toFixed(1)}%`,
                    trend: `Total perdido: ${formatMoney(simulationLossTotal, activeSimulation.currency)}`,
                    trendClass: 'negative',
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
                    return `Dia ${label} de ${simulationMonthLabel(monthIndex)}`;
                  }
                  return label;
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
                  { title: 'Neto del periodo', value: distributionAmountLabel(filteredMetrics.netResult, activeSimulation.currency), valueClass: filteredMetrics.netResult >= 0 ? 'positive' : 'negative' },
                  { title: 'Profit Factor', value: simulationProfitFactor },
                  { title: 'Win/Loss ratio', value: simulationWinLossRatio },
                ]}
              >
                <section className="table-card">
                <h2>Operaciones recientes</h2>
                <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Resultado</th>
                      <th>Invertido</th>
                      <th>Saldo</th>
                      <th>Técnico R</th>
                      <th>USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOperations.map((operation, index) => {
                      const snapshot = operationRiskSnapshots[index];

                      return (
                      <tr key={operation.id}>
                        <td>
                          <input
                            type="date"
                            aria-label={`Fecha ${operation.operationIndex}`}
                            value={operation.operationDate}
                            inputMode="none"
                            onFocus={openDatePicker}
                            onClick={openDatePicker}
                            onKeyDown={preventManualDateTyping}
                            onPaste={preventManualDatePasteOrDrop}
                            onDrop={preventManualDatePasteOrDrop}
                            onChange={(event) => handleOperationChange(operation.id, { operationDate: event.target.value })}
                          />
                        </td>
                        <td>
                          <select
                            aria-label={`Tipo ${operation.operationIndex}`}
                            value={operation.side ?? ''}
                            disabled={operation.resultType === 'no_trade'}
                            onChange={(event) => handleOperationChange(operation.id, { side: parseSimulationSide(event.target.value) })}
                          >
                            <option value="">N/A</option>
                            <option value="buy">Buy</option>
                            <option value="sell">Sell</option>
                          </select>
                        </td>
                        <td>
                          <select
                            aria-label={`Resultado ${operation.operationIndex}`}
                            value={operation.resultType}
                            onChange={(event) => handleOperationChange(operation.id, { resultType: parseSimulationResultType(event.target.value) })}
                          >
                            <option value="win">Exito</option>
                            <option value="sl">SL</option>
                            <option value="breakeven">Breakeven</option>
                            <option value="no_trade">No operar</option>
                          </select>
                        </td>
                        <td>
                          <strong>
                            {snapshot ? formatMoney(snapshot.investedAmountDisplay, activeSimulation?.currency ?? 'USD') : formatMoney(operation.investedAmount, activeSimulation?.currency ?? 'USD')}
                          </strong>
                        </td>
                        <td>
                          <strong>
                            {snapshot ? formatMoney(snapshot.balanceAfter, activeSimulation?.currency ?? 'USD') : formatMoney(activeSimulation?.initialBalance ?? 0, activeSimulation?.currency ?? 'USD')}
                          </strong>
                        </td>
                        <td>
                          <input
                            type="number"
                            aria-label={`Tecnico ${operation.operationIndex}`}
                            step="0.01"
                            value={operation.technicalResultR ?? ''}
                            disabled={operation.resultType === 'no_trade'}
                            onChange={(event) => handleOperationChange(operation.id, { technicalResultR: event.target.value === '' ? null : Number.parseFloat(event.target.value) })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            aria-label={`USD ${operation.operationIndex}`}
                            step="0.01"
                            value={operation.monetaryResult}
                            disabled={operation.resultType === 'no_trade'}
                            onChange={(event) => handleOperationChange(operation.id, { monetaryResult: Number.parseFloat(event.target.value || '0') })}
                          />
                        </td>
                      </tr>
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

      {!isLoading && !error && simulations.length === 0 && (
        <section className="simulations-empty">
          <h3>No hay simulaciones guardadas</h3>
          <p>Cuando guardes tu primera simulación aparecerá aquí para reabrirla y seguir editando.</p>
        </section>
      )}

      {!isLoading && !error && simulations.length > 0 && (
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
