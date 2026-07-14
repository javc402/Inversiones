import {
  SimulationOperation,
  SimulationOperationInput,
  SimulationResultType,
  SimulationSide,
} from '@services/simulations';

export interface SimulationOperationDraft extends SimulationOperationInput {
  id: string;
  note: string;
  isManualEdit: boolean;
}

export interface SimulationWorkspaceMetrics {
  totalOpportunities: number;
  totalExecuted: number;
  totalWin: number;
  totalSl: number;
  totalBreakeven: number;
  totalNoTrade: number;
  netResult: number;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export function normalizeSimulationOperationDraft(operation: SimulationOperationDraft): SimulationOperationDraft {
  if (operation.resultType === 'no_trade') {
    return {
      ...operation,
      side: null,
      investedAmount: 0,
      technicalResultR: null,
      monetaryResult: 0,
    };
  }

  if (operation.resultType === 'breakeven') {
    const invested = Number.isFinite(operation.investedAmount) ? Math.max(0, operation.investedAmount) : 0;
    return {
      ...operation,
      side: operation.side ?? 'buy',
      technicalResultR: 1,
      monetaryResult: round2(invested),
      investedAmount: invested,
    };
  }

  return {
    ...operation,
    side: operation.side ?? 'buy',
  };
}

export function createOperationDraftId(operationDate: string, operationIndex: number): string {
  return `${operationDate}-${operationIndex}`;
}

export function createSimulationOperationDrafts(
  operations: Array<SimulationOperation | SimulationOperationInput>
): SimulationOperationDraft[] {
  return operations.map((operation) => normalizeSimulationOperationDraft({
    id: 'id' in operation ? operation.id : createOperationDraftId(operation.operationDate, operation.operationIndex),
    operationDate: operation.operationDate,
    operationTime: operation.operationTime ?? '09:00',
    operationIndex: operation.operationIndex,
    side: operation.side,
    resultType: operation.resultType,
    investedAmount: Number(operation.investedAmount),
    technicalResultR: operation.technicalResultR === null ? null : Number(operation.technicalResultR),
    monetaryResult: Number(operation.monetaryResult),
    note: operation.note ?? '',
    isManualEdit: operation.isManualEdit ?? false,
  }));
}

export function summarizeSimulationOperations(operations: SimulationOperationDraft[]): SimulationWorkspaceMetrics {
  return operations.reduce<SimulationWorkspaceMetrics>((summary, operation) => {
    const next = { ...summary };
    next.totalOpportunities += 1;
    next.netResult = round2(next.netResult + operation.monetaryResult);

    if (operation.resultType === 'no_trade') {
      next.totalNoTrade += 1;
      return next;
    }

    next.totalExecuted += 1;
    if (operation.resultType === 'win') next.totalWin += 1;
    if (operation.resultType === 'sl') next.totalSl += 1;
    if (operation.resultType === 'breakeven') next.totalBreakeven += 1;
    return next;
  }, {
    totalOpportunities: 0,
    totalExecuted: 0,
    totalWin: 0,
    totalSl: 0,
    totalBreakeven: 0,
    totalNoTrade: 0,
    netResult: 0,
  });
}

export function toSimulationOperationInputs(operations: SimulationOperationDraft[]): SimulationOperationInput[] {
  return operations.map((operation) => ({
    operationDate: operation.operationDate,
    operationTime: operation.operationTime,
    operationIndex: operation.operationIndex,
    side: operation.side,
    resultType: operation.resultType,
    investedAmount: operation.investedAmount,
    technicalResultR: operation.technicalResultR,
    monetaryResult: operation.monetaryResult,
    note: operation.note,
    isManualEdit: operation.isManualEdit,
  }));
}

export function parseSimulationSide(value: string): SimulationSide | null {
  return value === 'buy' || value === 'sell' ? value : null;
}

export function parseSimulationResultType(value: string): SimulationResultType {
  if (value === 'win' || value === 'sl' || value === 'breakeven' || value === 'no_trade') {
    return value;
  }

  return 'breakeven';
}