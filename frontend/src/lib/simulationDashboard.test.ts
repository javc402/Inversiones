import { describe, expect, it } from 'vitest';
import {
  calculateSimulationDistributionData,
  calculateSimulationTimelineData,
  filterSimulationOperations,
  getSimulationAvailableMonths,
  getSimulationAvailableYears,
} from './simulationDashboard';
import { SimulationOperationDraft } from './simulationWorkspace';

const operations: SimulationOperationDraft[] = [
  { id: '1', operationDate: '2025-12-31', operationIndex: 1, side: 'buy', resultType: 'win', investedAmount: 100, technicalResultR: 1, monetaryResult: 100, note: '', isManualEdit: false },
  { id: '2', operationDate: '2026-01-05', operationIndex: 1, side: 'sell', resultType: 'sl', investedAmount: 100, technicalResultR: -1, monetaryResult: -100, note: '', isManualEdit: false },
  { id: '3', operationDate: '2026-01-10', operationIndex: 2, side: 'buy', resultType: 'breakeven', investedAmount: 100, technicalResultR: 0, monetaryResult: 0, note: '', isManualEdit: false },
  { id: '4', operationDate: '2026-02-01', operationIndex: 1, side: null, resultType: 'no_trade', investedAmount: 0, technicalResultR: null, monetaryResult: 0, note: '', isManualEdit: false },
];

describe('simulationDashboard', () => {
  it('filtra por año y mes y expone opciones disponibles', () => {
    expect(getSimulationAvailableYears(operations)).toEqual([2026, 2025]);
    expect(getSimulationAvailableMonths(operations, '2026')).toEqual([0, 1]);
    expect(filterSimulationOperations(operations, '2026', '0')).toHaveLength(2);
    expect(filterSimulationOperations(operations, '2025', 'all')).toHaveLength(1);
  });

  it('calcula timeline anual y mensual', () => {
    const yearly = calculateSimulationTimelineData(operations, '2026', 'all');
    expect(yearly[0]).toMatchObject({ label: 'Ene', lossAmount: -100, breakevenAmount: 0 });
    expect(yearly[1]).toMatchObject({ label: 'Feb', amount: 0, lossAmount: 0 });

    const monthly = calculateSimulationTimelineData(operations, '2026', '0');
    expect(monthly[4]).toMatchObject({ label: '5', lossAmount: -100 });
    expect(monthly[9]).toMatchObject({ label: '10', breakevenAmount: 0 });
  });

  it('calcula distribucion de resultados', () => {
    const distribution = calculateSimulationDistributionData(operations);
    expect(distribution).toEqual([
      expect.objectContaining({ name: 'Exito', operations: 1, value: 25 }),
      expect.objectContaining({ name: 'SL', operations: 1, value: 25, totalAmount: -100 }),
      expect.objectContaining({ name: 'Breakeven', operations: 1, value: 25 }),
      expect.objectContaining({ name: 'No operar', operations: 1, value: 25 }),
    ]);
  });
});