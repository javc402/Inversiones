import { describe, expect, it } from 'vitest';
import {
  createSimulationOperationDrafts,
  normalizeSimulationOperationDraft,
  parseSimulationResultType,
  parseSimulationSide,
  summarizeSimulationOperations,
  toSimulationOperationInputs,
} from './simulationWorkspace';

describe('simulationWorkspace', () => {
  it('normaliza no_trade y fuerza buy cuando una ejecutada no tiene side', () => {
    expect(normalizeSimulationOperationDraft({
      id: '1',
      operationDate: '2026-01-01',
      operationIndex: 1,
      side: 'sell',
      resultType: 'no_trade',
      investedAmount: 100,
      technicalResultR: 1,
      monetaryResult: 100,
      note: '',
      isManualEdit: false,
    })).toMatchObject({
      side: null,
      investedAmount: 0,
      technicalResultR: null,
      monetaryResult: 0,
    });

    expect(normalizeSimulationOperationDraft({
      id: '2',
      operationDate: '2026-01-01',
      operationIndex: 2,
      side: null,
      resultType: 'win',
      investedAmount: 100,
      technicalResultR: 1,
      monetaryResult: 100,
      note: '',
      isManualEdit: false,
    }).side).toBe('buy');
  });

  it('crea drafts y resume metricas del workspace', () => {
    const drafts = createSimulationOperationDrafts([
      {
        id: 'op-1',
        simulationId: 'sim-1',
        userId: 'user-1',
        operationDate: '2026-01-01',
        operationIndex: 1,
        side: 'buy',
        resultType: 'win',
        investedAmount: 100,
        technicalResultR: 1,
        monetaryResult: 100,
        note: '',
        isManualEdit: false,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'op-2',
        simulationId: 'sim-1',
        userId: 'user-1',
        operationDate: '2026-01-01',
        operationIndex: 2,
        side: null,
        resultType: 'no_trade',
        investedAmount: 0,
        technicalResultR: null,
        monetaryResult: 0,
        note: '',
        isManualEdit: false,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'op-3',
        simulationId: 'sim-1',
        userId: 'user-1',
        operationDate: '2026-01-02',
        operationIndex: 1,
        side: 'sell',
        resultType: 'sl',
        investedAmount: 100,
        technicalResultR: -1,
        monetaryResult: -100,
        note: '',
        isManualEdit: false,
        createdAt: '',
        updatedAt: '',
      },
    ]);

    expect(summarizeSimulationOperations(drafts)).toEqual({
      totalOpportunities: 3,
      totalExecuted: 2,
      totalWin: 1,
      totalSl: 1,
      totalBreakeven: 0,
      totalNoTrade: 1,
      netResult: 0,
    });
    expect(toSimulationOperationInputs(drafts)).toHaveLength(3);
  });

  it('parsea side y result type con fallback seguro', () => {
    expect(parseSimulationSide('buy')).toBe('buy');
    expect(parseSimulationSide('other')).toBeNull();
    expect(parseSimulationResultType('sl')).toBe('sl');
    expect(parseSimulationResultType('other')).toBe('breakeven');
  });
});