import { describe, expect, it } from 'vitest';
import {
  buildCreateMarketEntryRequest,
  buildCreatePerAccountSelection,
  buildDefaultAccountRows,
  createAccountRow,
  directionLabel,
  entryDeletionLabel,
  formatDate as formatEntryDate,
  statusLabel as marketStatusLabel,
  toNumber,
  toNumberOrNull,
} from '@components/MarketEntriesModule';
import {
  formatCurrency,
  formatDate as formatDashboardDate,
  isDashboardTab,
  loadStoredDashboardTab,
  roleNameLabel,
  statusLabel as dashboardStatusLabel,
  tradeResultClass,
} from '@pages/DashboardPage';
import {
  getSummaryRows,
  mapAccountToForm,
  mapFormToPayload,
  toNumberOrUndefined,
  toStringOrEmpty,
} from '@components/AccountsModule';

describe('coverage helpers', () => {
  it('dashboard tabs valida valores', () => {
    expect(isDashboardTab('resumen')).toBe(true);
    expect(isDashboardTab('entradas')).toBe(true);
    expect(isDashboardTab('otro')).toBe(false);
    expect(isDashboardTab(null)).toBe(false);
  });

  it('dashboard loadStoredDashboardTab usa fallback', () => {
    localStorage.setItem('inversiones_dashboard_active_tab', 'noticias');
    expect(loadStoredDashboardTab()).toBe('noticias');

    localStorage.setItem('inversiones_dashboard_active_tab', 'incorrecto');
    expect(loadStoredDashboardTab()).toBe('resumen');
  });

  it('dashboard formatea fechas y moneda', () => {
    expect(formatDashboardDate('invalid-date')).toBe('invalid-date');
    expect(formatCurrency(1234.5)).toContain('USD');
  });

  it('dashboard labels y clase de resultado', () => {
    expect(dashboardStatusLabel('planned')).toBe('Planeada');
    expect(dashboardStatusLabel('open')).toBe('Abierta');
    expect(dashboardStatusLabel('closed')).toBe('Completada');
    expect(dashboardStatusLabel('no_entry')).toBe('Sin entrada');
    expect(dashboardStatusLabel('cancelled')).toBe('Cancelada');

    expect(roleNameLabel('admin')).toBe('Administrador');
    expect(roleNameLabel('user')).toBe('Usuario');
    expect(roleNameLabel(null)).toBe('Sin rol');

    expect(tradeResultClass('-1.20R')).toBe('negative');
    expect(tradeResultClass('N/A')).toBe('neutral');
    expect(tradeResultClass('+2.10R')).toBe('positive');
  });

  it('accounts helpers de conversion', () => {
    expect(toNumberOrUndefined('')).toBeUndefined();
    expect(toNumberOrUndefined('abc')).toBeUndefined();
    expect(toNumberOrUndefined(' 10.5 ')).toBe(10.5);
    expect(toStringOrEmpty(null)).toBe('');
    expect(toStringOrEmpty(42)).toBe('42');
  });

  it('accounts mapAccountToForm y mapFormToPayload', () => {
    const account = {
      id: 'acc-1',
      user_id: 'user-1',
      name: 'Cuenta A',
      alias: 'A',
      broker_name: 'Broker',
      account_type: 'funded',
      platform: 'mt5',
      base_currency: 'usd',
      leverage: '1:100',
      initial_balance: 1000,
      initial_equity: 980,
      opened_at: '2026-06-20T10:00:00.000Z',
      status: 'active',
      risk_per_trade_pct: 1,
      max_daily_risk_pct: 3,
      max_drawdown_pct: 8,
      funding_firm: 'Firm',
      challenge_phase: 'phase_2',
      profit_target_pct: 10,
      daily_loss_limit_pct: 4,
      max_loss_limit_pct: 10,
      payout_cycle: 'monthly',
      notes: 'Notas',
      is_favorite: false,
      created_at: '2026-06-20T10:00:00.000Z',
      updated_at: '2026-06-20T10:00:00.000Z',
    } as never;

    const form = mapAccountToForm(account);
    expect(form.name).toBe('Cuenta A');
    expect(form.account_type).toBe('funded');

    const payload = mapFormToPayload({
      ...form,
      base_currency: 'usd',
      initial_balance: '1500',
      profit_target_pct: '12',
      daily_loss_limit_pct: '5',
      max_loss_limit_pct: '9',
    } as never);

    expect(payload.base_currency).toBe('USD');
    expect(payload.initial_balance).toBe(1500);
    expect(payload.funding_firm).toBe('Firm');
    expect(payload.profit_target_pct).toBe(12);

    const noFundedPayload = mapFormToPayload({
      ...form,
      account_type: 'real',
    } as never);
    expect(noFundedPayload.funding_firm).toBeUndefined();
  });

  it('accounts summary rows por defecto', () => {
    const rows = getSummaryRows();
    expect(rows).toHaveLength(4);
    expect(rows[0].label).toBe('Total');
  });

  it('market helpers basicos', () => {
    expect(createAccountRow('acc-1').accountId).toBe('acc-1');
    expect(formatEntryDate('2026-06-20T10:00:00.000Z')).toBeTruthy();
    expect(marketStatusLabel('planned')).toBe('Planificada');
    expect(marketStatusLabel('cancelled')).toBe('Cancelada');
    expect(directionLabel('buy')).toBe('BUY');
    expect(directionLabel('sell')).toBe('SELL');
    expect(toNumber(' 1.25 ')).toBe(1.25);
    expect(toNumberOrNull('')).toBeNull();
    expect(toNumberOrNull(' 2.5 ')).toBe(2.5);
  });

  it('market helpers cubren ramas adicionales', () => {
    const originalRandomUUID = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
    });

    expect(createAccountRow().id).toContain('account-row-');

    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: originalRandomUUID,
      configurable: true,
    });

    expect(() => formatEntryDate('')).toThrow();
    expect(marketStatusLabel('open')).toBe('Abierta');
    expect(marketStatusLabel('closed')).toBe('Completada');
    expect(marketStatusLabel('no_entry')).toBe('Sin entrada');
    expect(Number.isNaN(toNumber('abc'))).toBe(true);
    expect(Number.isNaN(toNumberOrNull('abc') as number)).toBe(true);
  });

  it('market entryDeletionLabel cubre casos', () => {
    expect(
      entryDeletionLabel({ status: 'open', accountName: 'Real', symbol: 'EURUSD' } as never)
    ).toContain('entrada de Real');
    expect(
      entryDeletionLabel({ status: 'no_entry', accountName: 'Real', symbol: '' } as never)
    ).toBe('registro sin entrada');
    expect(
      entryDeletionLabel({ status: 'no_entry', accountName: 'Real', symbol: 'XAUUSD' } as never)
    ).toContain('XAUUSD');
  });

  it('market buildCreatePerAccountSelection valida duplicados y cuentas invalidas', () => {
    const accounts = [
      { id: 'acc-1', name: 'Cuenta 1', alias: 'C1' },
      { id: 'acc-2', name: 'Cuenta 2', alias: 'C2' },
    ] as never;

    const rows = [
      { id: '1', accountId: 'acc-1', riskAmount: '100', investmentPercent: '1' },
      { id: '2', accountId: 'acc-2', riskAmount: '80', investmentPercent: '0.8' },
    ];

    const selection = buildCreatePerAccountSelection(accounts, rows, false);
    expect(selection).toHaveLength(2);
    expect(selection[0].riskAmount).toBe(100);

    expect(() =>
      buildCreatePerAccountSelection(accounts, [{ id: '1', accountId: 'nope', riskAmount: '1', investmentPercent: '1' }], false)
    ).toThrow('Selecciona una cuenta valida');

    expect(() =>
      buildCreatePerAccountSelection(accounts, [
        { id: '1', accountId: 'acc-1', riskAmount: '1', investmentPercent: '1' },
        { id: '2', accountId: 'acc-1', riskAmount: '2', investmentPercent: '2' },
      ], false)
    ).toThrow('esta repetida');

    expect(buildCreatePerAccountSelection(accounts, rows, true)).toEqual([]);
  });

  it('market buildCreateMarketEntryRequest valida y transforma', () => {
    const common = {
      symbol: 'EURUSD',
      marketContext: 'CPI',
      contextSource: 'free_text',
      newsArticleId: 'news-1',
      setup: 'Breakout',
      session: 'NEW YORK',
      direction: 'buy',
      entryPrice: '1.1',
      stopLoss: '1.09',
      takeProfit: '1.12',
      resultR: '',
      noEntryReason: '',
      note: '',
      plannedAt: '2026-06-20T10:00',
      status: 'closed',
    } satisfies Parameters<typeof buildCreateMarketEntryRequest>[0];

    expect(() =>
      buildCreateMarketEntryRequest(common, [], false, true)
    ).toThrow('Debes indicar Resultado R');

    const request = buildCreateMarketEntryRequest(
      { ...common, status: 'no_entry', noEntryReason: 'No setup', resultR: '1.2' },
      [],
      true,
      false
    );

    expect(request.createInput.common.noEntryReason).toBe('No setup');
    expect(request.createInput.common.direction).toBeUndefined();
  });

  it('market buildCreateMarketEntryRequest cubre newsArticleId y parseos numéricos', () => {
    const newsRequest = buildCreateMarketEntryRequest(
      {
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'news',
        newsArticleId: '',
        setup: 'Breakout',
        session: 'NY',
        direction: 'buy',
        entryPrice: '1.1',
        stopLoss: '1.09',
        takeProfit: '1.12',
        resultR: '',
        noEntryReason: '',
        note: '',
        plannedAt: '2026-06-20T10:00',
        status: 'planned',
      },
      [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
      false,
      false
    );
    expect(newsRequest.createInput.common.newsArticleId).toBe('');

    const invalidNumbersRequest = buildCreateMarketEntryRequest(
      {
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        newsArticleId: 'news-1',
        setup: 'Breakout',
        session: 'NY',
        direction: 'buy',
        entryPrice: '',
        stopLoss: '',
        takeProfit: '',
        resultR: '',
        noEntryReason: '',
        note: '',
        plannedAt: '2026-06-20T10:00',
        status: 'planned',
      },
      [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
      false,
      false
    );
    expect(invalidNumbersRequest.createInput.common.entryPrice).toBe(0);

    expect(() =>
      buildCreateMarketEntryRequest(
        {
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          newsArticleId: 'news-1',
          setup: 'Breakout',
          session: 'NY',
          direction: 'buy',
          entryPrice: '1.1',
          stopLoss: '1.09',
          takeProfit: '1.12',
          resultR: '',
          noEntryReason: '',
          note: '',
          plannedAt: '2026-06-20T10:00',
          status: 'planned',
        } as never,
        [{ accountId: 'acc-1', accountName: 'Cuenta 1', riskAmount: 100, investmentPercent: 1 }],
        false,
        true
      )
    ).toThrow('Debes indicar Resultado R');
  });

  it('market buildDefaultAccountRows usa cuenta por defecto', () => {
    const rowsWithoutAccounts = buildDefaultAccountRows([] as never);
    expect(rowsWithoutAccounts).toHaveLength(1);

    const rowsWithAccounts = buildDefaultAccountRows([{ id: 'acc-1' }] as never);
    expect(rowsWithAccounts[0].accountId).toBe('acc-1');
  });
});
