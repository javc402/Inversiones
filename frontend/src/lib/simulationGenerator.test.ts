import { describe, expect, it, vi } from 'vitest';
import { countSimulationOperableDays, generateSimulationArtifacts, listSimulationOperableDates } from './simulationGenerator';

describe('simulationGenerator', () => {
  it('lista y cuenta dias operables respetando rango y weekdays', () => {
    expect(listSimulationOperableDates('2026-01-01', '2026-01-07', ['mon', 'wed', 'fri'])).toEqual([
      '2026-01-02',
      '2026-01-05',
      '2026-01-07',
    ]);
    expect(countSimulationOperableDays('2026-01-01', '2026-01-07', ['mon', 'wed', 'fri'])).toBe(3);
    expect(countSimulationOperableDays('2026-01-07', '2026-01-01', ['mon'])).toBe(0);
  });

  it('genera resultados deterministas con la misma semilla', () => {
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));

    const first = generateSimulationArtifacts({
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      maxOperationsPerDay: 4,
      pctWin: 40,
      pctSl: 30,
      pctBreakeven: 20,
      pctNoTrade: 10,
      initialBalance: 10000,
      seed: 123456,
    });
    const second = generateSimulationArtifacts({
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      maxOperationsPerDay: 4,
      pctWin: 40,
      pctSl: 30,
      pctBreakeven: 20,
      pctNoTrade: 10,
      initialBalance: 10000,
      seed: 123456,
    });

    expect(second).toEqual(first);
    expect(first.totalOpportunities).toBe(first.operations.length);
    expect(first.totalExecuted + first.totalNoTrade).toBe(first.totalOpportunities);
  });

  it('genera filas no_trade coherentes y calcula metricas monetarias', () => {
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));

    const result = generateSimulationArtifacts({
      startDate: '2026-01-05',
      endDate: '2026-01-09',
      weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      maxOperationsPerDay: 3,
      pctWin: 25,
      pctSl: 25,
      pctBreakeven: 25,
      pctNoTrade: 25,
      initialBalance: 5000,
      seed: 42,
    });

    const noTradeRows = result.operations.filter((operation) => operation.resultType === 'no_trade');
    const executedRows = result.operations.filter((operation) => operation.resultType !== 'no_trade');

    expect(noTradeRows).toHaveLength(result.totalNoTrade);
    expect(noTradeRows.every((operation) => operation.side === null && operation.investedAmount === 0 && operation.technicalResultR === null && operation.monetaryResult === 0)).toBe(true);
    expect(executedRows.every((operation) => operation.side === 'buy' || operation.side === 'sell')).toBe(true);
    expect(result.netResult).toBe(executedRows.reduce((sum, operation) => sum + operation.monetaryResult, 0));
    expect(result.generatedAt).toBe('2026-07-10T12:00:00.000Z');
  });

  it('aplica el riesgo porcentual sobre el balance actual', () => {
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));

    const result = generateSimulationArtifacts({
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      maxOperationsPerDay: 4,
      pctWin: 100,
      pctSl: 0,
      pctBreakeven: 0,
      pctNoTrade: 0,
      initialBalance: 10000,
      seed: 123456,
      riskPctMin: 0.01,
      riskPctMax: 0.01,
    });

    expect(result.operations.length).toBeGreaterThan(1);

    const firstOperation = result.operations[0];
    const secondOperation = result.operations[1];
    const roundedSecondInvestment = Number(((10000 + firstOperation.monetaryResult) * 0.01).toFixed(2));

    expect(firstOperation.investedAmount).toBe(100);
    expect(firstOperation.monetaryResult).toBe(Number((firstOperation.investedAmount * firstOperation.technicalResultR!).toFixed(2)));
    expect(secondOperation.investedAmount).toBe(roundedSecondInvestment);
    expect(secondOperation.monetaryResult).toBe(Number((secondOperation.investedAmount * secondOperation.technicalResultR!).toFixed(2)));
  });

  it('asigna un tecnico R mayor a 1 en operaciones ganadoras', () => {
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));

    const result = generateSimulationArtifacts({
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      maxOperationsPerDay: 4,
      pctWin: 100,
      pctSl: 0,
      pctBreakeven: 0,
      pctNoTrade: 0,
      initialBalance: 10000,
      seed: 123456,
      riskPctMin: 0.01,
      riskPctMax: 0.01,
    });

    const winRows = result.operations.filter((operation) => operation.resultType === 'win');

    expect(winRows.length).toBeGreaterThan(0);
    expect(winRows.every((operation) => operation.technicalResultR !== null && operation.technicalResultR > 1)).toBe(true);
    expect(winRows.every((operation) => operation.monetaryResult === Number((operation.investedAmount * operation.technicalResultR!).toFixed(2)))).toBe(true);
  });

  it('tolera maximo diario invalido devolviendo simulacion vacia', () => {
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));

    const result = generateSimulationArtifacts({
      startDate: '2026-01-05',
      endDate: '2026-01-09',
      weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      maxOperationsPerDay: 0,
      pctWin: 40,
      pctSl: 30,
      pctBreakeven: 20,
      pctNoTrade: 10,
      initialBalance: 5000,
      seed: 11,
    });

    expect(result.operations).toEqual([]);
    expect(result.totalOpportunities).toBe(0);
    expect(result.totalExecuted).toBe(0);
    expect(result.netResult).toBe(0);
  });

  it('genera exactamente una operación por cada día hábil cuando el máximo diario es 1', () => {
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));

    const startDate = '2026-01-01';
    const endDate = '2026-12-31';
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;
    const operableDays = countSimulationOperableDays(startDate, endDate, [...weekdays]);

    const result = generateSimulationArtifacts({
      startDate,
      endDate,
      weekdays: [...weekdays],
      maxOperationsPerDay: 1,
      pctWin: 40,
      pctSl: 30,
      pctBreakeven: 20,
      pctNoTrade: 10,
      initialBalance: 5000,
      seed: 99,
    });

    expect(result.totalOpportunities).toBe(operableDays);
    expect(result.operations).toHaveLength(operableDays);
  });

  it('garantiza al menos una operación por cada día hábil cuando el máximo diario es mayor a 1', () => {
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));

    const result = generateSimulationArtifacts({
      startDate: '2026-01-05',
      endDate: '2026-01-09',
      weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      maxOperationsPerDay: 2,
      pctWin: 25,
      pctSl: 25,
      pctBreakeven: 25,
      pctNoTrade: 25,
      initialBalance: 5000,
      seed: 123,
    });

    const countsByDate = result.operations.reduce<Record<string, number>>((accumulator, operation) => {
      accumulator[operation.operationDate] = (accumulator[operation.operationDate] ?? 0) + 1;
      return accumulator;
    }, {});

    expect(Object.values(countsByDate).every((count) => count >= 1 && count <= 2)).toBe(true);
  });
});