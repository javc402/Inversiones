import { supabase } from '@lib/supabase';

export type SimulationStatus = 'draft' | 'saved';
export type SimulationWeekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type SimulationSide = 'buy' | 'sell';
export type SimulationResultType = 'win' | 'sl' | 'breakeven' | 'no_trade';

export interface Simulation {
  id: string;
  userId: string;
  name: string;
  sourceAccountId: string | null;
  accountName: string;
  initialBalance: number;
  currency: string;
  startDate: string;
  endDate: string;
  weekdays: SimulationWeekday[];
  maxOperationsPerDay: number;
  riskPctMin: number;
  riskPctMax: number;
  pctWin: number;
  pctSl: number;
  pctBreakeven: number;
  pctNoTrade: number;
  seed: number;
  status: SimulationStatus;
  totalOpportunities: number;
  totalExecuted: number;
  totalWin: number;
  totalSl: number;
  totalBreakeven: number;
  totalNoTrade: number;
  netResult: number;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationOperation {
  id: string;
  simulationId: string;
  userId: string;
  operationDate: string;
  operationIndex: number;
  side: SimulationSide | null;
  resultType: SimulationResultType;
  investedAmount: number;
  technicalResultR: number | null;
  monetaryResult: number;
  note: string;
  isManualEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationInput {
  name: string;
  sourceAccountId?: string | null;
  accountName: string;
  initialBalance: number;
  currency?: string;
  startDate: string;
  endDate: string;
  weekdays: string[];
  maxOperationsPerDay: number;
  riskPctMin?: number;
  riskPctMax?: number;
  pctWin: number;
  pctSl: number;
  pctBreakeven: number;
  pctNoTrade: number;
  seed: number;
  status?: SimulationStatus;
  totalOpportunities?: number;
  totalExecuted?: number;
  totalWin?: number;
  totalSl?: number;
  totalBreakeven?: number;
  totalNoTrade?: number;
  netResult?: number;
  generatedAt?: string | null;
}

export interface SaveSimulationInput extends SimulationInput {
  id?: string;
}

export interface SimulationOperationInput {
  operationDate: string;
  operationIndex: number;
  side: SimulationSide | null;
  resultType: SimulationResultType;
  investedAmount: number;
  technicalResultR: number | null;
  monetaryResult: number;
  note?: string;
  isManualEdit?: boolean;
}

export interface SimulationOperationEditableInput {
  operationDate?: string;
  side?: SimulationSide | null;
  resultType?: SimulationResultType;
  investedAmount?: number;
  technicalResultR?: number | null;
  monetaryResult?: number;
  note?: string;
  isManualEdit?: boolean;
}

type SimulationRow = {
  id: string;
  user_id: string;
  name: string;
  source_account_id: string | null;
  account_name: string;
  initial_balance: number;
  currency: string;
  start_date: string;
  end_date: string;
  weekdays: SimulationWeekday[];
  max_operations_per_day: number;
  risk_pct_min: number;
  risk_pct_max: number;
  pct_win: number;
  pct_sl: number;
  pct_breakeven: number;
  pct_no_trade: number;
  seed: number;
  status: SimulationStatus;
  total_opportunities: number;
  total_executed: number;
  total_win: number;
  total_sl: number;
  total_breakeven: number;
  total_no_trade: number;
  net_result: number;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
};

type SimulationOperationRow = {
  id: string;
  simulation_id: string;
  user_id: string;
  operation_date: string;
  operation_index: number;
  side: SimulationSide | null;
  result_type: SimulationResultType;
  invested_amount: number;
  technical_result_r: number | null;
  monetary_result: number;
  note: string;
  is_manual_edit: boolean;
  created_at: string;
  updated_at: string;
};

const SIMULATION_COLUMNS = [
  'id',
  'user_id',
  'name',
  'source_account_id',
  'account_name',
  'initial_balance',
  'currency',
  'start_date',
  'end_date',
  'weekdays',
  'max_operations_per_day',
  'risk_pct_min',
  'risk_pct_max',
  'pct_win',
  'pct_sl',
  'pct_breakeven',
  'pct_no_trade',
  'seed',
  'status',
  'total_opportunities',
  'total_executed',
  'total_win',
  'total_sl',
  'total_breakeven',
  'total_no_trade',
  'net_result',
  'generated_at',
  'created_at',
  'updated_at',
].join(', ');

const LEGACY_SIMULATION_COLUMNS = [
  'id',
  'user_id',
  'name',
  'source_account_id',
  'account_name',
  'initial_balance',
  'currency',
  'start_date',
  'end_date',
  'weekdays',
  'max_operations_per_day',
  'pct_win',
  'pct_sl',
  'pct_breakeven',
  'pct_no_trade',
  'seed',
  'status',
  'total_opportunities',
  'total_executed',
  'total_win',
  'total_sl',
  'total_breakeven',
  'total_no_trade',
  'net_result',
  'generated_at',
  'created_at',
  'updated_at',
].join(', ');

const SIMULATION_OPERATION_COLUMNS = [
  'id',
  'simulation_id',
  'user_id',
  'operation_date',
  'operation_index',
  'side',
  'result_type',
  'invested_amount',
  'technical_result_r',
  'monetary_result',
  'note',
  'is_manual_edit',
  'created_at',
  'updated_at',
].join(', ');

const VALID_WEEKDAYS = new Set<SimulationWeekday>(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

function round3(value: number): number {
  return Number(value.toFixed(3));
}

function isMissingColumnError(error: unknown): boolean {
  return error instanceof Error && /column .* does not exist|could not find/i.test(error.message);
}

function normalizeWeekdays(values: string[]): SimulationWeekday[] {
  const normalized = values
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is SimulationWeekday => VALID_WEEKDAYS.has(item as SimulationWeekday));

  return [...new Set(normalized)];
}

function validateSimulationInput(input: SimulationInput): SimulationWeekday[] {
  if (!input.name.trim()) throw new Error('El nombre de la simulación es obligatorio.');
  if (!input.accountName.trim()) throw new Error('El nombre de la cuenta es obligatorio.');
  if (!Number.isFinite(input.initialBalance) || input.initialBalance <= 0) throw new Error('El capital inicial debe ser mayor a 0.');
  if (!input.startDate) throw new Error('La fecha de inicio es obligatoria.');
  if (!input.endDate) throw new Error('La fecha de fin es obligatoria.');
  if (input.startDate > input.endDate) throw new Error('La fecha de inicio no puede ser mayor que la fecha de fin.');
  if (!Number.isInteger(input.maxOperationsPerDay) || input.maxOperationsPerDay <= 0) {
    throw new Error('El máximo de operaciones por día debe ser un entero mayor a 0.');
  }

  const weekdays = normalizeWeekdays(input.weekdays);
  if (weekdays.length === 0) throw new Error('Debes seleccionar al menos un día de operación.');

  const percentages = [input.pctWin, input.pctSl, input.pctBreakeven, input.pctNoTrade];
  if (percentages.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new Error('Los porcentajes deben estar entre 0 y 100.');
  }

  const sum = round3(input.pctWin + input.pctSl + input.pctBreakeven + input.pctNoTrade);
  if (sum !== 100) {
    throw new Error('La suma de Exito, SL, Breakeven y No operar debe ser exactamente 100.');
  }

  const riskPctMin = input.riskPctMin ?? 0.01;
  const riskPctMax = input.riskPctMax ?? 0.01;
  if (!Number.isFinite(riskPctMin) || !Number.isFinite(riskPctMax) || riskPctMin < 0 || riskPctMax < 0 || riskPctMin > 1 || riskPctMax > 1) {
    throw new Error('El riesgo por operación debe estar entre 0 y 1.');
  }

  if (riskPctMin > riskPctMax) {
    throw new Error('El riesgo mínimo por operación no puede ser mayor que el máximo.');
  }

  if (!Number.isFinite(input.seed)) {
    throw new TypeError('La semilla de simulación es obligatoria.');
  }

  return weekdays;
}

function validateOperationInput(operation: SimulationOperationInput): void {
  if (!operation.operationDate) throw new Error('La fecha de operación es obligatoria.');
  if (!Number.isInteger(operation.operationIndex) || operation.operationIndex <= 0) {
    throw new Error('El índice de operación debe ser un entero mayor a 0.');
  }

  if (operation.resultType === 'no_trade') {
    if (operation.side !== null) throw new Error('Una fila no_trade no puede tener tipo buy/sell.');
    if (operation.investedAmount !== 0) throw new Error('Una fila no_trade debe tener invertido en 0.');
    if (operation.technicalResultR !== null) throw new Error('Una fila no_trade no puede tener resultado técnico.');
    if (operation.monetaryResult !== 0) throw new Error('Una fila no_trade debe tener resultado monetario en 0.');
    return;
  }

  if (!operation.side) {
    throw new Error('Las operaciones ejecutadas deben tener tipo buy o sell.');
  }

  if (!Number.isFinite(operation.investedAmount) || operation.investedAmount < 0) {
    throw new Error('El valor invertido debe ser mayor o igual a 0.');
  }

  if (!Number.isFinite(operation.monetaryResult)) {
    throw new TypeError('El resultado monetario debe ser numérico.');
  }
}

function buildSimulationOperationUpdatePayload(input: SimulationOperationEditableInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.operationDate !== undefined) payload.operation_date = input.operationDate;
  if (input.side !== undefined) payload.side = input.side;
  if (input.resultType !== undefined) payload.result_type = input.resultType;
  if (input.investedAmount !== undefined) payload.invested_amount = input.investedAmount;
  if (input.technicalResultR !== undefined) payload.technical_result_r = input.technicalResultR;
  if (input.monetaryResult !== undefined) payload.monetary_result = input.monetaryResult;
  if (input.note !== undefined) payload.note = input.note.trim();
  if (input.isManualEdit !== undefined) payload.is_manual_edit = input.isManualEdit;

  return payload;
}

function validateNoTradeEditablePayload(payload: Record<string, unknown>): void {
  const nextResultType = (payload.result_type as SimulationResultType | undefined) ?? null;
  if (nextResultType !== 'no_trade') {
    return;
  }

  if (payload.side !== undefined && payload.side !== null) {
    throw new Error('Una fila no_trade no puede tener tipo buy/sell.');
  }

  if (payload.invested_amount !== undefined && payload.invested_amount !== 0) {
    throw new Error('Una fila no_trade debe tener invertido en 0.');
  }

  if (payload.technical_result_r !== undefined && payload.technical_result_r !== null) {
    throw new Error('Una fila no_trade no puede tener resultado técnico.');
  }

  if (payload.monetary_result !== undefined && payload.monetary_result !== 0) {
    throw new Error('Una fila no_trade debe tener resultado monetario en 0.');
  }
}

function mapSimulationRow(row: SimulationRow): Simulation {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    sourceAccountId: row.source_account_id,
    accountName: row.account_name,
    initialBalance: Number(row.initial_balance),
    currency: row.currency,
    startDate: row.start_date,
    endDate: row.end_date,
    weekdays: row.weekdays,
    maxOperationsPerDay: row.max_operations_per_day,
    riskPctMin: Number(row.risk_pct_min),
    riskPctMax: Number(row.risk_pct_max),
    pctWin: Number(row.pct_win),
    pctSl: Number(row.pct_sl),
    pctBreakeven: Number(row.pct_breakeven),
    pctNoTrade: Number(row.pct_no_trade),
    seed: Number(row.seed),
    status: row.status,
    totalOpportunities: Number(row.total_opportunities),
    totalExecuted: Number(row.total_executed),
    totalWin: Number(row.total_win),
    totalSl: Number(row.total_sl),
    totalBreakeven: Number(row.total_breakeven),
    totalNoTrade: Number(row.total_no_trade),
    netResult: Number(row.net_result),
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLegacySimulationRow(row: Omit<SimulationRow, 'risk_pct_min' | 'risk_pct_max'>): Simulation {
  return {
    ...mapSimulationRow({
      ...row,
      risk_pct_min: 1,
      risk_pct_max: 1,
    }),
  };
}

function mapSimulationOperationRow(row: SimulationOperationRow): SimulationOperation {
  return {
    id: row.id,
    simulationId: row.simulation_id,
    userId: row.user_id,
    operationDate: row.operation_date,
    operationIndex: Number(row.operation_index),
    side: row.side,
    resultType: row.result_type,
    investedAmount: Number(row.invested_amount),
    technicalResultR: row.technical_result_r === null ? null : Number(row.technical_result_r),
    monetaryResult: Number(row.monetary_result),
    note: row.note,
    isManualEdit: row.is_manual_edit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function toSimulationPayload(input: SimulationInput, weekdays: SimulationWeekday[]) {
  return {
    name: input.name.trim(),
    source_account_id: input.sourceAccountId ?? null,
    account_name: input.accountName.trim(),
    initial_balance: input.initialBalance,
    currency: (input.currency ?? 'USD').trim().toUpperCase(),
    start_date: input.startDate,
    end_date: input.endDate,
    weekdays,
    max_operations_per_day: input.maxOperationsPerDay,
    risk_pct_min: round3(input.riskPctMin ?? 0.01),
    risk_pct_max: round3(input.riskPctMax ?? 0.01),
    pct_win: round3(input.pctWin),
    pct_sl: round3(input.pctSl),
    pct_breakeven: round3(input.pctBreakeven),
    pct_no_trade: round3(input.pctNoTrade),
    seed: Math.trunc(input.seed),
    status: input.status ?? 'draft',
    total_opportunities: input.totalOpportunities ?? 0,
    total_executed: input.totalExecuted ?? 0,
    total_win: input.totalWin ?? 0,
    total_sl: input.totalSl ?? 0,
    total_breakeven: input.totalBreakeven ?? 0,
    total_no_trade: input.totalNoTrade ?? 0,
    net_result: input.netResult ?? 0,
    generated_at: input.generatedAt ?? null,
    updated_at: new Date().toISOString(),
  };
}

function toLegacySimulationPayload(input: SimulationInput, weekdays: SimulationWeekday[]) {
  const payload = toSimulationPayload(input, weekdays);
  const { risk_pct_min: _riskPctMin, risk_pct_max: _riskPctMax, ...legacyPayload } = payload;
  return legacyPayload;
}

export async function listSimulations(status?: SimulationStatus): Promise<Simulation[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  let query = supabase.from('simulations').select(SIMULATION_COLUMNS).eq('user_id', userId);
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (!error) {
    return ((data ?? []) as unknown as SimulationRow[]).map(mapSimulationRow);
  }

  if (!isMissingColumnError(error)) {
    throw error;
  }

  let legacyQuery = supabase.from('simulations').select(LEGACY_SIMULATION_COLUMNS).eq('user_id', userId);
  if (status) {
    legacyQuery = legacyQuery.eq('status', status);
  }

  const { data: legacyData, error: legacyError } = await legacyQuery.order('updated_at', { ascending: false });
  if (legacyError) throw legacyError;

  return ((legacyData ?? []) as unknown as Array<Omit<SimulationRow, 'risk_pct_min' | 'risk_pct_max'>>).map(mapLegacySimulationRow);
}

export async function getSimulationById(simulationId: string): Promise<Simulation | null> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('simulations')
    .select(SIMULATION_COLUMNS)
    .eq('id', simulationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!error) {
    if (!data) return null;

    return mapSimulationRow(data as unknown as SimulationRow);
  }

  if (!isMissingColumnError(error)) {
    throw error;
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from('simulations')
    .select(LEGACY_SIMULATION_COLUMNS)
    .eq('id', simulationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (legacyError) throw legacyError;
  if (!legacyData) return null;

  return mapLegacySimulationRow(legacyData as unknown as Omit<SimulationRow, 'risk_pct_min' | 'risk_pct_max'>);
}

export async function createSimulationDraft(input: SimulationInput): Promise<Simulation> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('No hay un usuario autenticado para crear simulaciones.');

  const weekdays = validateSimulationInput(input);
  const payload = {
    ...toSimulationPayload({ ...input, status: input.status ?? 'draft' }, weekdays),
    user_id: userId,
  };

  const { data, error } = await supabase.from('simulations').insert(payload).select(SIMULATION_COLUMNS).single();
  if (!error) {
    return mapSimulationRow(data as unknown as SimulationRow);
  }

  if (!isMissingColumnError(error)) {
    throw error;
  }

  const legacyPayload = {
    ...toLegacySimulationPayload({ ...input, status: input.status ?? 'draft' }, weekdays),
    user_id: userId,
  };

  const { data: legacyData, error: legacyError } = await supabase.from('simulations').insert(legacyPayload).select(LEGACY_SIMULATION_COLUMNS).single();
  if (legacyError) throw legacyError;

  return mapLegacySimulationRow(legacyData as unknown as Omit<SimulationRow, 'risk_pct_min' | 'risk_pct_max'>);
}

export async function updateSimulation(simulationId: string, input: SimulationInput): Promise<Simulation> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('No hay un usuario autenticado para actualizar simulaciones.');

  const weekdays = validateSimulationInput(input);
  const payload = toSimulationPayload(input, weekdays);

  const { data, error } = await supabase
    .from('simulations')
    .update(payload)
    .eq('id', simulationId)
    .eq('user_id', userId)
    .select(SIMULATION_COLUMNS)
    .single();

  if (!error) {
    return mapSimulationRow(data as unknown as SimulationRow);
  }

  if (!isMissingColumnError(error)) {
    throw error;
  }

  const legacyPayload = toLegacySimulationPayload(input, weekdays);
  const { data: legacyData, error: legacyError } = await supabase
    .from('simulations')
    .update(legacyPayload)
    .eq('id', simulationId)
    .eq('user_id', userId)
    .select(LEGACY_SIMULATION_COLUMNS)
    .single();

  if (legacyError) throw legacyError;

  return mapLegacySimulationRow(legacyData as unknown as Omit<SimulationRow, 'risk_pct_min' | 'risk_pct_max'>);
}

export async function saveSimulation(input: SaveSimulationInput): Promise<Simulation> {
  if (input.id) {
    return updateSimulation(input.id, { ...input, status: 'saved' });
  }

  return createSimulationDraft({ ...input, status: 'saved' });
}

export async function deleteSimulation(simulationId: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('No hay un usuario autenticado para eliminar simulaciones.');

  const { error } = await supabase.from('simulations').delete().eq('id', simulationId).eq('user_id', userId);
  if (error) throw error;
}

export async function listSimulationOperations(simulationId: string): Promise<SimulationOperation[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('simulation_operations')
    .select(SIMULATION_OPERATION_COLUMNS)
    .eq('simulation_id', simulationId)
    .eq('user_id', userId)
    .order('operation_date', { ascending: true });

  if (!error) {
    return ((data ?? []) as unknown as SimulationOperationRow[])
      .map(mapSimulationOperationRow)
    .sort((a, b) => {
      if (a.operationDate === b.operationDate) {
        return a.operationIndex - b.operationIndex;
      }
      return a.operationDate.localeCompare(b.operationDate);
    });
  }

  if (!isMissingColumnError(error)) throw error;

  const { data: legacyData, error: legacyError } = await supabase
    .from('simulation_operations')
    .select(SIMULATION_OPERATION_COLUMNS.replace(', risk_pct', ''))
    .eq('simulation_id', simulationId)
    .eq('user_id', userId)
    .order('operation_date', { ascending: true });

  if (legacyError) throw legacyError;

  return ((legacyData ?? []) as unknown as SimulationOperationRow[])
    .map(mapSimulationOperationRow)
    .sort((a, b) => {
      if (a.operationDate === b.operationDate) {
        return a.operationIndex - b.operationIndex;
      }
      return a.operationDate.localeCompare(b.operationDate);
    });
}

export async function replaceSimulationOperations(
  simulationId: string,
  operations: SimulationOperationInput[]
): Promise<SimulationOperation[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('No hay un usuario autenticado para guardar operaciones de simulación.');

  operations.forEach(validateOperationInput);

  const { error: deleteError } = await supabase
    .from('simulation_operations')
    .delete()
    .eq('simulation_id', simulationId)
    .eq('user_id', userId);

  if (deleteError) throw deleteError;

  if (operations.length === 0) {
    return [];
  }

  const payload = operations.map((item) => ({
    simulation_id: simulationId,
    user_id: userId,
    operation_date: item.operationDate,
    operation_index: item.operationIndex,
    side: item.side,
    result_type: item.resultType,
    invested_amount: item.investedAmount,
    technical_result_r: item.technicalResultR,
    monetary_result: item.monetaryResult,
    note: item.note?.trim() ?? '',
    is_manual_edit: item.isManualEdit ?? false,
  }));

  const { data, error } = await supabase
    .from('simulation_operations')
    .insert(payload)
    .select(SIMULATION_OPERATION_COLUMNS);

  if (!error) {
    return ((data ?? []) as unknown as SimulationOperationRow[])
    .map(mapSimulationOperationRow)
    .sort((a, b) => {
      if (a.operationDate === b.operationDate) {
        return a.operationIndex - b.operationIndex;
      }
      return a.operationDate.localeCompare(b.operationDate);
    });
  }

  if (!isMissingColumnError(error)) throw error;

  const { data: legacyData, error: legacyError } = await supabase
    .from('simulation_operations')
    .insert(payload)
    .select(SIMULATION_OPERATION_COLUMNS.replace(', risk_pct', ''));

  if (legacyError) throw legacyError;

  return ((legacyData ?? []) as unknown as SimulationOperationRow[])
    .map(mapSimulationOperationRow)
    .sort((a, b) => {
      if (a.operationDate === b.operationDate) {
        return a.operationIndex - b.operationIndex;
      }
      return a.operationDate.localeCompare(b.operationDate);
    });
}

export async function updateSimulationOperation(
  simulationId: string,
  operationId: string,
  input: SimulationOperationEditableInput
): Promise<SimulationOperation> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('No hay un usuario autenticado para editar operaciones de simulación.');

  const payload = buildSimulationOperationUpdatePayload(input);
  validateNoTradeEditablePayload(payload);

  const { data, error } = await supabase
    .from('simulation_operations')
    .update(payload)
    .eq('id', operationId)
    .eq('simulation_id', simulationId)
    .eq('user_id', userId)
    .select(SIMULATION_OPERATION_COLUMNS)
    .single();

  if (!error) {
    return mapSimulationOperationRow(data as unknown as SimulationOperationRow);
  }

  if (!isMissingColumnError(error)) throw error;

  const { data: legacyData, error: legacyError } = await supabase
    .from('simulation_operations')
    .update(payload)
    .eq('id', operationId)
    .eq('simulation_id', simulationId)
    .eq('user_id', userId)
    .select(SIMULATION_OPERATION_COLUMNS.replace(', risk_pct', ''))
    .single();

  if (legacyError) throw legacyError;

  return mapSimulationOperationRow(legacyData as unknown as SimulationOperationRow);
}
