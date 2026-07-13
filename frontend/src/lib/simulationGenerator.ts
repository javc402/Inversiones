import { SimulationOperationInput, SimulationResultType, SimulationWeekday } from '@services/simulations';

export interface SimulationGenerationInput {
  startDate: string;
  endDate: string;
  weekdays: SimulationWeekday[];
  maxOperationsPerDay: number;
  pctWin: number;
  pctSl: number;
  pctBreakeven: number;
  pctNoTrade: number;
  initialBalance: number;
  seed: number;
  riskPctMin?: number;
  riskPctMax?: number;
}

export interface SimulationGenerationResult {
  operations: SimulationOperationInput[];
  totalOpportunities: number;
  totalExecuted: number;
  totalWin: number;
  totalSl: number;
  totalBreakeven: number;
  totalNoTrade: number;
  netResult: number;
  generatedAt: string;
}

const WEEKDAY_INDEX_BY_VALUE: Record<SimulationWeekday, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 0,
};

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function createMulberry32(seed: number): () => number {
  let current = seed >>> 0;

  return () => {
    current += 0x6d2b79f5;
    let mixed = Math.imul(current ^ (current >>> 15), 1 | current);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function randomIntInclusive(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function buildRandomOperationTime(random: () => number): string {
  const hour = randomIntInclusive(random, 8, 18);
  const minute = randomIntInclusive(random, 0, 11) * 5;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function buildTechnicalResultR(resultType: SimulationResultType, random: () => number): number | null {
  if (resultType === 'no_trade') {
    return null;
  }

  if (resultType === 'breakeven') {
    return 1;
  }

  if (resultType === 'sl') {
    return -1;
  }

  return round2(1.05 + (random() * 1.95));
}

function buildResultPool(
  total: number,
  distribution: Array<{ type: SimulationResultType; percentage: number }>,
  random: () => number
): SimulationResultType[] {
  if (total <= 0) {
    return [];
  }

  const rawCounts = distribution.map((item) => ({
    ...item,
    raw: (total * item.percentage) / 100,
  }));

  const counts = rawCounts.map((item) => Math.floor(item.raw));
  let remaining = total - counts.reduce((sum, value) => sum + value, 0);

  const order = rawCounts
    .map((item, index) => ({ index, fraction: item.raw - Math.floor(item.raw), tieBreaker: random() }))
    .sort((left, right) => {
      if (right.fraction !== left.fraction) {
        return right.fraction - left.fraction;
      }

      return right.tieBreaker - left.tieBreaker;
    });

  for (let index = 0; index < order.length && remaining > 0; index += 1) {
    counts[order[index].index] += 1;
    remaining -= 1;
  }

  const pool = counts.flatMap((count, index) => Array.from({ length: count }, () => distribution[index].type));

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIntInclusive(random, 0, index);
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  return pool;
}

export function listSimulationOperableDates(startDate: string, endDate: string, weekdays: SimulationWeekday[]): string[] {
  if (!startDate || !endDate || weekdays.length === 0 || startDate > endDate) {
    return [];
  }

  const weekdayIndexes = new Set(weekdays.map((weekday) => WEEKDAY_INDEX_BY_VALUE[weekday]));
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const limit = new Date(`${endDate}T12:00:00`);

  while (cursor <= limit) {
    if (weekdayIndexes.has(cursor.getDay())) {
      dates.push(cursor.toISOString().slice(0, 10));
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function countSimulationOperableDays(startDate: string, endDate: string, weekdays: SimulationWeekday[]): number {
  return listSimulationOperableDates(startDate, endDate, weekdays).length;
}

export function generateSimulationArtifacts(input: SimulationGenerationInput): SimulationGenerationResult {
  const operableDates = listSimulationOperableDates(input.startDate, input.endDate, input.weekdays);
  const normalizedSeed = Math.abs(Math.trunc(input.seed)) || 1;
  const random = createMulberry32(normalizedSeed);
  const maxOperationsPerDay = Number.isInteger(input.maxOperationsPerDay) && input.maxOperationsPerDay > 0 ? input.maxOperationsPerDay : 0;
  const riskPctMin = Math.min(input.riskPctMin ?? 0.01, input.riskPctMax ?? 0.01);
  const riskPctMax = Math.max(input.riskPctMin ?? 0.01, input.riskPctMax ?? 0.01);
  const opportunitiesByDate = operableDates.map((date) => ({
    date,
    opportunities: maxOperationsPerDay > 0 ? randomIntInclusive(random, 1, maxOperationsPerDay) : 0,
  }));
  const totalOpportunities = opportunitiesByDate.reduce((sum, item) => sum + item.opportunities, 0);
  const resultPool = buildResultPool(
    totalOpportunities,
    [
      { type: 'win', percentage: input.pctWin },
      { type: 'sl', percentage: input.pctSl },
      { type: 'breakeven', percentage: input.pctBreakeven },
      { type: 'no_trade', percentage: input.pctNoTrade },
    ],
    random
  );

  let poolIndex = 0;
  const operations: SimulationOperationInput[] = [];
  let totalWin = 0;
  let totalSl = 0;
  let totalBreakeven = 0;
  let totalNoTrade = 0;
  let netResult = 0;
  let currentBalance = round2(input.initialBalance);

  for (const day of opportunitiesByDate) {
    for (let operationIndex = 1; operationIndex <= day.opportunities; operationIndex += 1) {
      const resultType = resultPool[poolIndex] ?? 'no_trade';
      poolIndex += 1;

      if (resultType === 'no_trade') {
        totalNoTrade += 1;
        operations.push({
          operationDate: day.date,
          operationTime: buildRandomOperationTime(random),
          operationIndex,
          side: null,
          resultType,
          investedAmount: 0,
          technicalResultR: null,
          monetaryResult: 0,
          note: '',
          isManualEdit: false,
        });
        continue;
      }

      const technicalResultR = buildTechnicalResultR(resultType, random);
      const riskPct = round2(riskPctMin + (random() * (riskPctMax - riskPctMin)));
      const investedAmount = round2(currentBalance * riskPct);
      const monetaryResult = round2(investedAmount * technicalResultR!);

      if (resultType === 'win') totalWin += 1;
      if (resultType === 'sl') totalSl += 1;
      if (resultType === 'breakeven') totalBreakeven += 1;
      netResult = round2(netResult + monetaryResult);
      currentBalance = round2(currentBalance + monetaryResult);

      operations.push({
        operationDate: day.date,
        operationTime: buildRandomOperationTime(random),
        operationIndex,
        side: random() < 0.5 ? 'buy' : 'sell',
        resultType,
        investedAmount,
        technicalResultR,
        monetaryResult,
        note: '',
        isManualEdit: false,
      });
    }
  }

  return {
    operations,
    totalOpportunities,
    totalExecuted: totalOpportunities - totalNoTrade,
    totalWin,
    totalSl,
    totalBreakeven,
    totalNoTrade,
    netResult,
    generatedAt: new Date().toISOString(),
  };
}