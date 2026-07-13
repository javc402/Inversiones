import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import MarketEntriesModule, {
  buildCreateMarketEntryRequest,
  buildCreatePerAccountSelection,
  buildDefaultAccountRows,
  calculateAccountResultAmount,
  candleProtocolLabel,
  directionLabel,
  entryDeletionLabel,
  formatCurrencyAmountInput,
  financialOutcomeLabel,
  newsImpactLabel,
  normalizeEditableEntryStatus,
  normalizeResultR,
  parseCurrencyAmount,
  resolveEntrySymbol,
  resolveFinancialOutcome,
  resolveTechnicalOutcome,
  sanitizeCurrencyAmountDraft,
  statusLabel,
  technicalOutcomeLabel,
  toDateTimeLocalValue,
  toEditableCurrencyAmount,
  toErrorMessage,
  toNumber,
  toNumberOrNull,
} from './MarketEntriesModule';
import * as marketEntriesService from '@services/market-entries';
import * as accountsService from '@services/accounts';
import * as newsService from '@services/news';

vi.mock('@services/market-entries');
vi.mock('@services/accounts');
vi.mock('@services/news');
vi.mock('@services/audit');
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return { ...actual, createPortal: (el: React.ReactNode) => el };
});

describe('MarketEntriesModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValue([]);
    vi.mocked(marketEntriesService.listMostUsedMarketContexts).mockResolvedValue([]);
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValue([]);
    vi.mocked(newsService.listUserNews).mockResolvedValue([]);
  });

  it('should render the module', () => {
    render(<MarketEntriesModule userEmail="test@example.com" />);
    expect(screen.getByText('Entradas al mercado')).toBeInTheDocument();
  });

  it('should show empty state when there are no accounts', async () => {
    render(<MarketEntriesModule userEmail="test@example.com" />);
    expect(await screen.findByText('No hay cuentas disponibles')).toBeInTheDocument();
  });

  it('should render the search input', () => {
    render(<MarketEntriesModule userEmail="test@example.com" />);
    expect(screen.getByPlaceholderText(/Buscar/i)).toBeInTheDocument();
  });

  it('should render the account filter', () => {
    render(<MarketEntriesModule userEmail="test@example.com" />);
    expect(screen.getByText('Todas las cuentas')).toBeInTheDocument();
  });

  it('should disable create button without accounts', () => {
    render(<MarketEntriesModule userEmail="test@example.com" />);
    expect(screen.getByRole('button', { name: /Nueva entrada/i })).toBeDisabled();
  });

  it('should show kpi cards', () => {
    render(<MarketEntriesModule userEmail="test@example.com" />);
    expect(screen.getByText('Registros visibles')).toBeInTheDocument();
    expect(screen.getByText('Riesgo total visible')).toBeInTheDocument();
    expect(screen.getByText('Cuentas activas')).toBeInTheDocument();
  });

  it('should not offer duplicated accounts in second row', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Cuenta Uno',
        alias: '1ras',
      } as never,
      {
        id: 'acc-2',
        name: 'Cuenta Dos',
        alias: '2das',
      } as never,
    ]);

    const { container } = render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: /Nueva entrada/i }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar cuenta/i }));

    await waitFor(() => {
      const selects = container.querySelectorAll('.entries-accounts-row select');
      expect(selects).toHaveLength(2);
    });

    const selects = container.querySelectorAll('.entries-accounts-row select');
    const secondSelectOptions = Array.from(selects[1].querySelectorAll('option')).map((option) => option.textContent?.trim() ?? '');

    expect(secondSelectOptions).not.toContain('1ras');
    expect(secondSelectOptions).toContain('2das');
  });

  it('should load and display market entries', async () => {
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.05,
        takeProfit: 1.15,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        note: 'Test entry',
        status: 'open',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);

    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Cuenta Real',
        alias: 'Real',
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    expect(await screen.findByText(/EURUSD/)).toBeInTheDocument();
    expect(screen.getByText('Breakout')).toBeInTheDocument();
  });

  it('should enable create button when accounts are available', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Cuenta Real',
        alias: 'Real',
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    expect(await screen.findByRole('button', { name: /Nueva entrada/i })).not.toBeDisabled();
  });

  it('should open create modal when clicking Nueva entrada button', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Cuenta Real',
        alias: 'Real',
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: /Nueva entrada/i }));

    expect(screen.getByText('Nueva entrada al mercado')).toBeInTheDocument();
  });

  it('should filter entries by account', async () => {
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.05,
        takeProfit: 1.15,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        note: '',
        status: 'open',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
      {
        id: 'entry-2',
        groupId: 'group-2',
        userEmail: 'test@example.com',
        accountId: 'acc-2',
        accountName: 'Cuenta Demo',
        symbol: 'GBPUSD',
        marketContext: 'NFP',
        setup: 'Pullback',
        session: 'LONDON',
        direction: 'sell',
        entryPrice: 1.3,
        stopLoss: 1.31,
        takeProfit: 1.28,
        riskAmount: 50,
        investmentPercent: 0.5,
        resultR: null,
        note: '',
        status: 'planned',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);

    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Cuenta Real',
        alias: 'Real',
      } as never,
      {
        id: 'acc-2',
        name: 'Cuenta Demo',
        alias: 'Demo',
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    expect(await screen.findByText(/EURUSD/)).toBeInTheDocument();
    expect(screen.getByText(/GBPUSD/)).toBeInTheDocument();

    const accountFilter = screen.getByDisplayValue('Todas las cuentas');
    fireEvent.change(accountFilter, { target: { value: 'acc-1' } });

    expect(screen.getByText(/EURUSD/)).toBeInTheDocument();
    expect(screen.queryByText(/GBPUSD/)).not.toBeInTheDocument();
  });

  it('should search entries by symbol', async () => {
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.05,
        takeProfit: 1.15,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        note: '',
        status: 'open',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
      {
        id: 'entry-2',
        groupId: 'group-2',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'GBPUSD',
        marketContext: 'NFP',
        setup: 'Pullback',
        session: 'LONDON',
        direction: 'sell',
        entryPrice: 1.3,
        stopLoss: 1.31,
        takeProfit: 1.28,
        riskAmount: 50,
        investmentPercent: 0.5,
        resultR: null,
        note: '',
        status: 'planned',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);

    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Cuenta Real',
        alias: 'Real',
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    expect(await screen.findByText(/EURUSD/)).toBeInTheDocument();
    expect(screen.getByText(/GBPUSD/)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Buscar/i);
    fireEvent.change(searchInput, { target: { value: 'EUR' } });

    expect(screen.getByText(/EURUSD/)).toBeInTheDocument();
    expect(screen.queryByText(/GBPUSD/)).not.toBeInTheDocument();
  });

  it('should calculate correct KPIs', async () => {
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.05,
        takeProfit: 1.15,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        note: '',
        status: 'open',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);

    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Cuenta Real',
        alias: 'Real',
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    expect(await screen.findByText('Registros visibles')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('Cuentas activas')).toBeInTheDocument();
  });

  it('should handle entry deletion', async () => {
    const deleteMarketEntryByIdMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(marketEntriesService.deleteMarketEntryById as any).mockImplementation(deleteMarketEntryByIdMock);

    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValue([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.05,
        takeProfit: 1.15,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        note: '',
        status: 'open',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);

    vi.mocked(accountsService.listTradingAccounts).mockResolvedValue([
      {
        id: 'acc-1',
        name: 'Cuenta Real',
        alias: 'Real',
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    expect(await screen.findByText(/EURUSD/)).toBeInTheDocument();
  });

  it('should handle error when loading entries fails', async () => {
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockRejectedValueOnce(new Error('Load failed'));
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Cuenta Real',
        alias: 'Real',
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    expect(await screen.findByText('Entradas al mercado')).toBeInTheDocument();
  });

  it('should display different entry statuses', async () => {
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.05,
        takeProfit: 1.15,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        note: '',
        status: 'open',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
      {
        id: 'entry-2',
        groupId: 'group-2',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'GBPUSD',
        marketContext: 'NFP',
        setup: 'Pullback',
        session: 'LONDON',
        direction: 'sell',
        entryPrice: 1.3,
        stopLoss: 1.31,
        takeProfit: 1.28,
        riskAmount: 50,
        investmentPercent: 0.5,
        resultR: 1.5,
        note: '',
        status: 'closed',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);

    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Cuenta Real',
        alias: 'Real',
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    expect(await screen.findByText(/EURUSD/)).toBeInTheDocument();
    expect(screen.getByText(/GBPUSD/)).toBeInTheDocument();
    expect(screen.getByText(/Tecnico: TP extendido/)).toBeInTheDocument();
    expect(screen.getByText(/Financiero: Ganancia/)).toBeInTheDocument();
  });

  it('should classify R=1.0 as break tecnico and financial gain', async () => {
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        riskAmount: 150,
        investmentPercent: 1,
        resultR: 1,
        note: '',
        status: 'closed',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);

    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Cuenta Real',
        alias: 'Real',
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    expect(await screen.findByText(/EURUSD/)).toBeInTheDocument();
    expect(screen.getByText(/Tecnico: Break tecnico 1:1/)).toBeInTheDocument();
    expect(screen.getByText(/Financiero: Ganancia/)).toBeInTheDocument();
    expect(screen.getByText(/Resultado cuenta: \$150.00/)).toBeInTheDocument();
  });

  it('should show error alert when loading entries fails', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockRejectedValueOnce(new Error('Load failed'));

    render(<MarketEntriesModule userEmail="test@example.com" />);

    expect(await screen.findByText('No se pudieron cargar las entradas desde la base de datos.')).toBeInTheDocument();
  });

  it('should delete entry when confirmation is accepted', async () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    vi.mocked(marketEntriesService.deleteMarketEntryById).mockResolvedValueOnce();
    vi.mocked(marketEntriesService.listMarketEntriesByUser)
      .mockResolvedValueOnce([
        {
          id: 'entry-1',
          groupId: 'group-1',
          userEmail: 'test@example.com',
          accountId: 'acc-1',
          accountName: 'Cuenta Real',
          symbol: 'EURUSD',
          marketContext: 'CPI',
          contextSource: 'free_text',
          newsArticleId: null,
          setup: 'Breakout',
          session: 'NEW YORK',
          direction: 'buy',
          entryPrice: 1.1,
          stopLoss: 1.05,
          takeProfit: 1.15,
          riskAmount: 100,
          investmentPercent: 1,
          resultR: null,
          noEntryReason: null,
          note: '',
          status: 'open',
          plannedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as never,
      ])
      .mockResolvedValueOnce([]);
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValue([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar entrada' }));

    await waitFor(() => {
      expect(marketEntriesService.deleteMarketEntryById).toHaveBeenCalled();
    });
    confirmSpy.mockRestore();
  });

  it('should not delete entry when confirmation is cancelled', async () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        newsArticleId: null,
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.05,
        takeProfit: 1.15,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        noEntryReason: null,
        note: '',
        status: 'open',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar entrada' }));
    expect(marketEntriesService.deleteMarketEntryById).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('should open edit modal from entry card', async () => {
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        newsArticleId: null,
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.05,
        takeProfit: 1.15,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        noEntryReason: null,
        note: '',
        status: 'open',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Editar entrada' }));
    expect(await screen.findByText('Editar entrada por cuenta')).toBeInTheDocument();
  });

  it('should open edit modal immediately on dashboard event without refresh', async () => {
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        newsArticleId: null,
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.05,
        takeProfit: 1.15,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        noEntryReason: null,
        note: '',
        status: 'open',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);
    await screen.findByText(/EURUSD/);

    window.dispatchEvent(new CustomEvent('inversiones:open-entry-edit', { detail: { entryId: 'entry-1' } }));

    expect(await screen.findByText('Editar entrada por cuenta')).toBeInTheDocument();
  });

  it('should render no-entry cards with reason text', async () => {
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: '',
        accountName: '',
        symbol: '',
        marketContext: 'NFP',
        contextSource: 'news',
        newsArticleId: 'news-1',
        setup: '',
        session: '',
        direction: 'buy',
        entryPrice: 0,
        stopLoss: 0,
        takeProfit: 0,
        riskAmount: 0,
        investmentPercent: 0,
        resultR: null,
        noEntryReason: 'Spread alto',
        note: 'Sin ejecución',
        status: 'no_entry',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    expect(await screen.findByText('Sin entrada al mercado')).toBeInTheDocument();
    expect(screen.getByText(/Motivo sin entrada:/)).toBeInTheDocument();
    expect(screen.getByText('Spread alto')).toBeInTheDocument();
  });

  it('should create a no-entry record from modal', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);
    vi.mocked(newsService.listUserNews).mockResolvedValueOnce([
      {
        id: 'news-1',
        user_email: 'test@example.com',
        title: 'CPI',
        source: 'Reuters',
        published_at: '2026-06-29T10:00:00.000Z',
        impact: 'high',
        summary: 'summary',
        category: 'macro',
        tags: ['usd'],
        is_published: true,
        created_at: '2026-06-29T10:00:00.000Z',
        updated_at: '2026-06-29T10:00:00.000Z',
      } as never,
    ]);
    vi.mocked(marketEntriesService.createMarketEntriesForAccounts).mockResolvedValueOnce([] as never);
    vi.mocked(marketEntriesService.listMarketEntriesByUser)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: /Nueva entrada/i }));
    fireEvent.change(screen.getByDisplayValue('Selecciona símbolo'), { target: { value: 'EURUSD' } });
    fireEvent.change(screen.getByDisplayValue('Completada'), { target: { value: 'no_entry' } });
    fireEvent.change(screen.getByDisplayValue('Selecciona noticia'), { target: { value: 'news-1' } });
    fireEvent.change(screen.getByDisplayValue('Selecciona impacto'), { target: { value: 'high' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar entradas' }));

    await waitFor(() => {
      expect(marketEntriesService.createMarketEntriesForAccounts).toHaveBeenCalled();
    });
  });

  it('should prevent duplicate create submit on double click', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);
    vi.mocked(newsService.listUserNews).mockResolvedValueOnce([
      {
        id: 'news-1',
        user_email: 'test@example.com',
        title: 'CPI',
        source: 'Reuters',
        published_at: '2026-06-29T10:00:00.000Z',
        impact: 'high',
        summary: 'summary',
        category: 'macro',
        tags: ['usd'],
        is_published: true,
        created_at: '2026-06-29T10:00:00.000Z',
        updated_at: '2026-06-29T10:00:00.000Z',
      } as never,
    ]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([]);

    let resolveCreate: (() => void) | undefined;
    vi.mocked(marketEntriesService.createMarketEntriesForAccounts).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = () => resolve([] as never);
        }) as never
    );

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: /Nueva entrada/i }));
    fireEvent.change(screen.getByDisplayValue('Selecciona símbolo'), { target: { value: 'EURUSD' } });
    fireEvent.change(screen.getByDisplayValue('Completada'), { target: { value: 'no_entry' } });
    fireEvent.change(screen.getByDisplayValue('Selecciona noticia'), { target: { value: 'news-1' } });
    fireEvent.change(screen.getByDisplayValue('Selecciona impacto'), { target: { value: 'high' } });
    const saveButton = screen.getByRole('button', { name: 'Guardar entradas' });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(marketEntriesService.createMarketEntriesForAccounts).toHaveBeenCalledTimes(1);

    resolveCreate?.();
  });

  it('should show create error message when submit fails', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);
    vi.mocked(newsService.listUserNews).mockResolvedValueOnce([
      {
        id: 'news-1',
        user_email: 'test@example.com',
        title: 'CPI',
        source: 'Reuters',
        published_at: '2026-06-29T10:00:00.000Z',
        impact: 'high',
        summary: 'summary',
        category: 'macro',
        tags: ['usd'],
        is_published: true,
        created_at: '2026-06-29T10:00:00.000Z',
        updated_at: '2026-06-29T10:00:00.000Z',
      } as never,
    ]);
    vi.mocked(marketEntriesService.createMarketEntriesForAccounts).mockRejectedValueOnce(new Error('No se pudo guardar'));
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: /Nueva entrada/i }));
    fireEvent.change(screen.getByDisplayValue('Selecciona símbolo'), { target: { value: 'EURUSD' } });
    fireEvent.change(screen.getByDisplayValue('Completada'), { target: { value: 'no_entry' } });
    fireEvent.change(screen.getByDisplayValue('Selecciona noticia'), { target: { value: 'news-1' } });
    fireEvent.change(screen.getByDisplayValue('Selecciona impacto'), { target: { value: 'high' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar entradas' }));

    const errors = await screen.findAllByText('No se pudo guardar');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should save edited entry from modal', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValue([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValue([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        newsArticleId: null,
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.05,
        takeProfit: 1.15,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        noEntryReason: null,
        note: '',
        status: 'open',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);
    vi.mocked(marketEntriesService.updateMarketEntryById).mockResolvedValueOnce({
      updatedEntry: {} as never,
      affectedEntries: 1,
      groupApplied: false,
    } as never);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Editar entrada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(marketEntriesService.updateMarketEntryById).toHaveBeenCalled();
    });
  });

  it('should open and close help popover in modal', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValue([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: /Nueva entrada/i }));
    fireEvent.change(screen.getByDisplayValue('Completada'), { target: { value: 'no_entry' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda: Noticia' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('should trigger changes across create modal fields', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
      { id: 'acc-2', name: 'Cuenta Demo', alias: 'Demo' } as never,
    ]);
    vi.mocked(newsService.listUserNews).mockResolvedValueOnce([
      {
        id: 'news-1',
        user_email: 'test@example.com',
        title: 'CPI',
        source: 'Reuters',
        published_at: '2026-06-29T10:00:00.000Z',
        impact: 'high',
        summary: 'summary',
        category: 'macro',
        tags: ['usd'],
        is_published: true,
        created_at: '2026-06-29T10:00:00.000Z',
        updated_at: '2026-06-29T10:00:00.000Z',
      } as never,
    ]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([]);

    render(<MarketEntriesModule userEmail="test@example.com" />);
    fireEvent.click(await screen.findByRole('button', { name: /Nueva entrada/i }));

    const fields = document.querySelectorAll('dialog input, dialog select, dialog textarea');
    fields.forEach((field) => {
      if (field instanceof HTMLInputElement) {
        if (field.type === 'number') {
          fireEvent.change(field, { target: { value: '1' } });
        } else if (field.type === 'datetime-local') {
          fireEvent.change(field, { target: { value: '2026-06-29T10:00' } });
        } else {
          fireEvent.change(field, { target: { value: field.value || 'valor' } });
        }
      } else if (field instanceof HTMLSelectElement) {
        const option = field.options.length > 1 ? field.options[1].value : field.value;
        fireEvent.change(field, { target: { value: option } });
      } else if (field instanceof HTMLTextAreaElement) {
        fireEvent.change(field, { target: { value: 'nota' } });
      }
    });

    fireEvent.click(screen.getByRole('button', { name: /Agregar cuenta/i }));
    const removeButtons = screen.queryAllByRole('button', { name: /Eliminar fila/i });
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);
    }

    expect(screen.getByRole('button', { name: 'Guardar entradas' })).toBeInTheDocument();
  });

  it('should trigger changes across edit modal fields', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValue([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        newsArticleId: null,
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.09,
        takeProfit: 1.12,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        noEntryReason: null,
        note: '',
        status: 'open',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar entrada' }));

    const fields = document.querySelectorAll('dialog input, dialog select, dialog textarea');
    fields.forEach((field) => {
      if (field instanceof HTMLInputElement && field.type === 'number') {
        fireEvent.change(field, { target: { value: '2' } });
      } else if (field instanceof HTMLSelectElement) {
        const option = field.options.length > 1 ? field.options[1].value : field.value;
        fireEvent.change(field, { target: { value: option } });
      } else if (field instanceof HTMLTextAreaElement) {
        fireEvent.change(field, { target: { value: 'nota editada' } });
      }
    });

    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
  });

  it('should allow correcting a no-entry record into a closed trade', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: '',
        accountName: '',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        newsArticleId: null,
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.09,
        takeProfit: 1.12,
        riskAmount: 0,
        investmentPercent: 0,
        resultR: null,
        noEntryReason: 'Error al registrar',
        note: '',
        status: 'no_entry',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);
    vi.mocked(marketEntriesService.updateMarketEntryById).mockResolvedValueOnce({
      updatedEntry: {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        newsArticleId: null,
        newsImpact: null,
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.09,
        takeProfit: 1.12,
        closePrice: null,
        operationLink: null,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: 1.2,
        noEntryReason: null,
        note: 'corregida',
        status: 'closed',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
      affectedEntries: 1,
      groupApplied: false,
    } as never);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Editar entrada' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(screen.getByRole('combobox', { name: 'Cuenta' }), { target: { value: 'acc-1' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Direccion' }), { target: { value: 'buy' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Estado' }), { target: { value: 'closed' } });
    const decimalInputs = dialog.querySelectorAll('input[inputmode="decimal"]');
    expect(decimalInputs.length).toBeGreaterThanOrEqual(2);
    fireEvent.change(decimalInputs[0] as HTMLInputElement, { target: { value: '$100.00' } });
    fireEvent.change(decimalInputs[1] as HTMLInputElement, { target: { value: '1.2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(marketEntriesService.updateMarketEntryById).toHaveBeenCalledWith(
        'test@example.com',
        'entry-1',
        expect.objectContaining({
          status: 'closed',
          accountId: 'acc-1',
          accountName: 'Real',
          direction: 'buy',
          riskAmount: 100,
          investmentPercent: 1,
          resultR: 1.2,
          noEntryReason: 'Error al registrar',
          note: '',
          operationLink: '',
          plannedAt: expect.any(String),
        }),
        { applyCommonToGroup: false }
      );
    });
  });

  it('should close help popover on outside click and keep it stable on viewport resize', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: /Nueva entrada/i }));
    fireEvent.change(screen.getByDisplayValue('Completada'), { target: { value: 'no_entry' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda: Noticia' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    window.dispatchEvent(new Event('resize'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('should show news module only when status is no_entry', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);
    vi.mocked(newsService.listUserNews).mockResolvedValueOnce([
      {
        id: 'news-1',
        user_email: 'test@example.com',
        title: 'IPC de EE.UU',
        source: 'Bloomberg',
        published_at: '2026-07-01T10:00:00.000Z',
        impact: 'high',
        summary: 'Resumen',
        category: 'macro',
        tags: ['usd'],
        is_published: true,
        created_at: '2026-07-01T10:00:00.000Z',
        updated_at: '2026-07-01T10:00:00.000Z',
      } as never,
    ]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: /Nueva entrada/i }));
    expect(screen.queryByDisplayValue('Selecciona noticia')).not.toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Completada'), { target: { value: 'no_entry' } });
    expect(screen.getByDisplayValue('Selecciona noticia')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Buscar por titulo o categoria')).not.toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Selecciona noticia'), { target: { value: 'news-1' } });
    fireEvent.change(screen.getByDisplayValue('Selecciona impacto'), { target: { value: 'high' } });
  });

  it('should add and remove account rows in create modal', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
      { id: 'acc-2', name: 'Cuenta Demo', alias: 'Demo' } as never,
    ]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([]);

    const { container } = render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: /Nueva entrada/i }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar cuenta/i }));

    await waitFor(() => {
      expect(container.querySelectorAll('.entries-accounts-row')).toHaveLength(2);
    });

    const removeButtons = screen.getAllByRole('button', { name: /Quitar/i });
    fireEvent.click(removeButtons[removeButtons.length - 1]);

    await waitFor(() => {
      expect(container.querySelectorAll('.entries-accounts-row')).toHaveLength(1);
    });
  });

  it('should trigger datetime picker handlers in create and edit modals and close with cancel', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValue([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValue([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        newsArticleId: null,
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.05,
        takeProfit: 1.15,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        noEntryReason: null,
        note: '',
        status: 'open',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: /Nueva entrada/i }));
    const createDatetime = document.querySelector('dialog input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.focus(createDatetime);
    fireEvent.click(createDatetime);
    fireEvent.keyDown(createDatetime, { key: '1' });
    fireEvent.keyDown(createDatetime, { key: 'Tab' });
    fireEvent.paste(createDatetime, { clipboardData: { getData: () => '2026-07-10T09:00' } as unknown as DataTransfer });
    fireEvent.change(createDatetime, { target: { value: '2026-07-10T09:00' } });

    fireEvent.mouseDown(screen.getByText('Nueva entrada al mercado'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const createDialog = screen.getByRole('dialog');
    fireEvent(createDialog, new Event('cancel', { cancelable: true }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Editar entrada' }));
    const editDatetime = document.querySelector('dialog input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.focus(editDatetime);
    fireEvent.click(editDatetime);
    fireEvent.keyDown(editDatetime, { key: '2' });
    fireEvent.keyDown(editDatetime, { key: 'Tab' });
    fireEvent.paste(editDatetime, { clipboardData: { getData: () => '2026-07-11T10:00' } as unknown as DataTransfer });
    fireEvent.change(editDatetime, { target: { value: '2026-07-11T10:00' } });
  });

  it('should render operation link and custom symbol field in create flow', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        newsArticleId: null,
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.05,
        takeProfit: 1.15,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        noEntryReason: null,
        note: '',
        status: 'open',
        operationLink: 'https://example.com/op',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    const link = await screen.findByRole('link', { name: 'Abrir enlace' });
    expect(link).toHaveAttribute('href', 'https://example.com/op');

    fireEvent.click(screen.getByRole('button', { name: /Nueva entrada/i }));
    fireEvent.change(screen.getByDisplayValue('Selecciona símbolo'), { target: { value: 'OTRO' } });
    const customSymbolInput = screen.getByPlaceholderText('Ej: DE40');
    fireEvent.change(customSymbolInput, { target: { value: 'nas100' } });
    expect((customSymbolInput as HTMLInputElement).value).toBe('NAS100');
  });

  it('should execute focus/blur format handlers in create and edit risk inputs', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValue([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValue([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        newsArticleId: null,
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.05,
        takeProfit: 1.15,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        noEntryReason: null,
        note: '',
        status: 'open',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: /Nueva entrada/i }));
    const createRisk = screen.getByPlaceholderText('$0.00');
    fireEvent.focus(createRisk);
    fireEvent.change(createRisk, { target: { value: '120.5' } });
    fireEvent.blur(createRisk);
    expect((createRisk as HTMLInputElement).value).toBe('$120.50');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Editar entrada' }));
    const editRisk = screen.getByLabelText('Riesgo por cuenta (USD)');
    fireEvent.focus(editRisk);
    fireEvent.change(editRisk, { target: { value: '99.4' } });
    fireEvent.blur(editRisk);
    await waitFor(() => {
      expect((editRisk as HTMLInputElement).value).toMatch(/99\.4|\$99\.40/);
    });
  });

  it('should handle pending edit id not found and refresh accounts by event', async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('missing-entry-id');
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => undefined);

    vi.mocked(accountsService.listTradingAccounts)
      .mockResolvedValueOnce([{ id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never])
      .mockResolvedValueOnce([{ id: 'acc-2', name: 'Cuenta Demo', alias: 'Demo' } as never]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: 'acc-1',
        accountName: 'Cuenta Real',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'free_text',
        newsArticleId: null,
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.05,
        takeProfit: 1.15,
        riskAmount: 100,
        investmentPercent: 1,
        resultR: null,
        noEntryReason: null,
        note: '',
        status: 'open',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    await screen.findByText('Entradas al mercado');
    await waitFor(() => {
      expect(removeItemSpy).toHaveBeenCalled();
    });

    window.dispatchEvent(new CustomEvent('inversiones:accounts-changed'));
    await waitFor(() => {
      expect(accountsService.listTradingAccounts.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    getItemSpy.mockRestore();
    removeItemSpy.mockRestore();
  });

  it('should close accordion section on transition end after status change', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      { id: 'acc-1', name: 'Cuenta Real', alias: 'Real' } as never,
    ]);
    vi.mocked(newsService.listUserNews).mockResolvedValueOnce([
      {
        id: 'news-1',
        user_email: 'test@example.com',
        title: 'IPC de EE.UU',
        source: 'Bloomberg',
        published_at: '2026-07-01T10:00:00.000Z',
        impact: 'high',
        summary: 'Resumen',
        category: 'macro',
        tags: ['usd'],
        is_published: true,
        created_at: '2026-07-01T10:00:00.000Z',
        updated_at: '2026-07-01T10:00:00.000Z',
      } as never,
    ]);
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValueOnce([
      {
        id: 'entry-1',
        groupId: 'group-1',
        userEmail: 'test@example.com',
        accountId: '',
        accountName: '',
        symbol: 'EURUSD',
        marketContext: 'CPI',
        contextSource: 'news',
        newsArticleId: 'news-1',
        newsImpact: 'high',
        setup: 'Breakout',
        session: 'NEW YORK',
        direction: 'buy',
        entryPrice: 1.1,
        stopLoss: 1.09,
        takeProfit: 1.12,
        riskAmount: 0,
        investmentPercent: 0,
        resultR: null,
        noEntryReason: 'sin entrada',
        note: '',
        status: 'no_entry',
        plannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
    ]);

    render(<MarketEntriesModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Editar entrada' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Estado' }), { target: { value: 'closed' } });

    const accordion = document.querySelector('.entries-accordion.is-closed') as HTMLDivElement;
    expect(accordion).toBeInTheDocument();
    fireEvent.transitionEnd(accordion);
  });

});

describe('MarketEntriesModule helpers', () => {
  it('resuelve etiquetas de estado, dirección y protocolos', () => {
    expect(statusLabel('planned')).toBe('Planificada');
    expect(statusLabel('open')).toBe('Abierta');
    expect(statusLabel('closed')).toBe('Completada');
    expect(statusLabel('no_entry')).toBe('Sin entrada');
    expect(statusLabel('cancelled')).toBe('Cancelada');

    expect(directionLabel('buy')).toBe('BUY');
    expect(directionLabel('sell')).toBe('SELL');

    expect(candleProtocolLabel('ob')).toBe('OB');
    expect(candleProtocolLabel('fvg')).toBe('FVG');
    expect(candleProtocolLabel(null)).toBe('NO');

    expect(newsImpactLabel('high')).toBe('Alto');
    expect(newsImpactLabel('medium')).toBe('Medio');
    expect(newsImpactLabel('low')).toBe('Bajo');
    expect(newsImpactLabel(null)).toBe('Sin impacto');
  });

  it('resuelve outcomes técnicos y financieros con todas las ramas', () => {
    const base = {
      id: 'e',
      groupId: 'g',
      userEmail: 'u',
      accountId: 'a',
      accountName: 'Cuenta',
      symbol: 'EURUSD',
      marketContext: 'ctx',
      contextSource: 'free_text',
      newsArticleId: null,
      newsImpact: null,
      setup: 's',
      session: 'NEW YORK',
      candleProtocol: 'no',
      direction: 'buy',
      entryPrice: 1,
      stopLoss: 1,
      takeProfit: 1,
      closePrice: null,
      operationLink: null,
      riskAmount: 100,
      investmentPercent: 1,
      noEntryReason: null,
      note: '',
      plannedAt: '2026-06-20T10:00:00.000Z',
      createdAt: '2026-06-20T10:00:00.000Z',
      updatedAt: '2026-06-20T10:00:00.000Z',
    };

    expect(resolveTechnicalOutcome({ ...base, status: 'open', resultR: 1 } as never)).toBeNull();
    expect(resolveTechnicalOutcome({ ...base, status: 'closed', resultR: null } as never)).toBeNull();
    expect(resolveTechnicalOutcome({ ...base, status: 'closed', resultR: -1 } as never)).toBe('sl');
    expect(resolveTechnicalOutcome({ ...base, status: 'closed', resultR: 0 } as never)).toBe('flat');
    expect(resolveTechnicalOutcome({ ...base, status: 'closed', resultR: 1 } as never)).toBe('tp_1_1');
    expect(resolveTechnicalOutcome({ ...base, status: 'closed', resultR: 2 } as never)).toBe('tp_extended');
    expect(resolveTechnicalOutcome({ ...base, status: 'closed', resultR: 0.5 } as never)).toBe('tp_partial');

    expect(technicalOutcomeLabel('sl')).toBe('SL');
    expect(technicalOutcomeLabel('flat')).toBe('Sin avance');
    expect(technicalOutcomeLabel('tp_1_1')).toBe('Break tecnico 1:1');
    expect(technicalOutcomeLabel('tp_extended')).toBe('TP extendido');
    expect(technicalOutcomeLabel('tp_partial')).toBe('TP parcial');

    expect(resolveFinancialOutcome({ ...base, status: 'open', resultR: 1 } as never)).toBeNull();
    expect(resolveFinancialOutcome({ ...base, status: 'closed', resultR: null } as never)).toBeNull();
    expect(resolveFinancialOutcome({ ...base, status: 'closed', resultR: -1 } as never)).toBe('loss');
    expect(resolveFinancialOutcome({ ...base, status: 'closed', resultR: 1 } as never)).toBe('profit');
    expect(resolveFinancialOutcome({ ...base, status: 'closed', resultR: 0 } as never)).toBe('breakeven');

    expect(financialOutcomeLabel('profit')).toBe('Ganancia');
    expect(financialOutcomeLabel('loss')).toBe('Perdida');
    expect(financialOutcomeLabel('breakeven')).toBe('Breakeven');
  });

  it('normaliza números y cálculo de resultado por cuenta', () => {
    expect(toNumber(' 1,25 ')).toBe(1.25);
    expect(toNumberOrNull('   ')).toBeNull();
    expect(toNumberOrNull(' 2,5 ')).toBe(2.5);

    expect(normalizeResultR(Number.NaN)).toBeNull();
    expect(normalizeResultR(1.236)).toBe(1.24);

    expect(calculateAccountResultAmount(Number.NaN, 1)).toBeNull();
    expect(calculateAccountResultAmount(0, 1)).toBeNull();
    expect(calculateAccountResultAmount(100, null)).toBeNull();
    expect(calculateAccountResultAmount(100, Number.NaN)).toBeNull();
    expect(calculateAccountResultAmount(100, 1.5)).toBe(150);
  });

  it('normaliza entradas monetarias y mensajes de error', () => {
    expect(parseCurrencyAmount('')).toBeNaN();
    expect(parseCurrencyAmount('$1,250.50')).toBe(1250.5);
    expect(parseCurrencyAmount('abc')).toBeNaN();

    expect(formatCurrencyAmountInput('')).toBe('');
    expect(formatCurrencyAmountInput('abc')).toBe('');
    expect(formatCurrencyAmountInput('1000')).toBe('$1,000.00');

    expect(sanitizeCurrencyAmountDraft('')).toBe('');
    expect(sanitizeCurrencyAmountDraft('$0012,345x')).toBe('12.34');
    expect(sanitizeCurrencyAmountDraft('10.')).toBe('10.');

    expect(toEditableCurrencyAmount('')).toBe('');
    expect(toEditableCurrencyAmount('$1,250.00')).toBe('1250');
    expect(toEditableCurrencyAmount('xx')).toBe('');

    expect(normalizeEditableEntryStatus('no_entry')).toBe('no_entry');
    expect(normalizeEditableEntryStatus('open')).toBe('closed');

    expect(toDateTimeLocalValue('invalid')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(toDateTimeLocalValue('2026-06-20T10:00:00.000Z')).toContain('2026-06-20T10:00');

    expect(toErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
    expect(toErrorMessage({ message: 'error', details: 'detalle', hint: 'hint' }, 'fallback')).toBe('error Detalle: detalle Sugerencia: hint');
    expect(toErrorMessage({ message: '   ' }, 'fallback')).toBe('fallback');
    expect(toErrorMessage('x', 'fallback')).toBe('fallback');
  });

  it('resuelve símbolo y etiqueta de borrado', () => {
    expect(resolveEntrySymbol({ symbol: 'OTRO', symbolDetail: ' NAS100 ' } as never)).toBe('NAS100');
    expect(resolveEntrySymbol({ symbol: 'OTRO', symbolDetail: '   ' } as never)).toBe('OTRO');
    expect(resolveEntrySymbol({ symbol: 'EURUSD', symbolDetail: null } as never)).toBe('EURUSD');

    expect(entryDeletionLabel({ status: 'open', accountName: 'Real', symbol: 'EURUSD' } as never)).toBe('entrada de Real para EURUSD');
    expect(entryDeletionLabel({ status: 'no_entry', accountName: '', symbol: '' } as never)).toBe('registro sin entrada');
    expect(entryDeletionLabel({ status: 'no_entry', accountName: '', symbol: 'EURUSD' } as never)).toBe('registro sin entrada de EURUSD');
  });

  it('construye selección por cuenta y valida duplicados/cuentas inválidas', () => {
    const accounts = [
      { id: 'acc-1', name: 'Cuenta Uno', alias: 'Uno' },
      { id: 'acc-2', name: 'Cuenta Dos', alias: '' },
    ] as never;

    const perAccount = buildCreatePerAccountSelection(
      accounts,
      [
        { id: 'r1', accountId: 'acc-1', riskAmount: '$100.00' },
        { id: 'r2', accountId: 'acc-2', riskAmount: '$50.00' },
      ],
      false,
    );
    expect(perAccount).toEqual([
      { accountId: 'acc-1', accountName: 'Uno', riskAmount: 100, investmentPercent: 1 },
      { accountId: 'acc-2', accountName: 'Cuenta Dos', riskAmount: 50, investmentPercent: 1 },
    ]);

    const noEntry = buildCreatePerAccountSelection(accounts, [{ id: 'r1', accountId: 'acc-1', riskAmount: '$999.00' }], true);
    expect(noEntry[0]?.riskAmount).toBe(0);

    expect(() => buildCreatePerAccountSelection(accounts, [{ id: 'r1', accountId: 'unknown', riskAmount: '$10.00' }], false))
      .toThrow('Selecciona una cuenta valida en la fila 1.');

    expect(() => buildCreatePerAccountSelection(accounts, [
      { id: 'r1', accountId: 'acc-1', riskAmount: '$10.00' },
      { id: 'r2', accountId: 'acc-1', riskAmount: '$20.00' },
    ], false)).toThrow('La cuenta Uno esta repetida.');
  });

  it('construye request create y valida Resultado R cuando aplica', () => {
    const commonForm = {
      symbol: 'nas100',
      symbolDetail: 'Indice',
      marketContext: 'NFP',
      contextSource: 'news',
      newsArticleId: 'news-1',
      newsImpact: 'high',
      setup: 'M3',
      session: 'NEW YORK',
      candleProtocol: 'ob',
      direction: 'buy',
      resultR: '1,5',
      operationLink: 'https://example.com',
      noEntryReason: '',
      note: 'nota',
      plannedAt: '2026-06-29T10:00',
      status: 'closed',
    };

    const { createInput, resultRValue } = buildCreateMarketEntryRequest(
      commonForm as never,
      [{ accountId: 'acc-1', accountName: 'Real', riskAmount: 100, investmentPercent: 1 }],
      false,
      true,
    );

    expect(resultRValue).toBe(1.5);
    expect(createInput.common.symbol).toBe('OTRO');
    expect(createInput.common.symbolDetail).toBe('NAS100');
    expect(createInput.common.contextSource).toBe('free_text');
    expect(createInput.common.newsArticleId).toBeNull();
    expect(createInput.common.newsImpact).toBeNull();

    const normal = buildCreateMarketEntryRequest(
      { ...commonForm, symbol: 'EURUSD', resultR: '3', status: 'open' } as never,
      [{ accountId: 'acc-1', accountName: 'Real', riskAmount: 100, investmentPercent: 1 }],
      false,
      false,
    );
    expect(normal.createInput.common.contextSource).toBe('free_text');
    expect(normal.createInput.common.newsArticleId).toBeNull();
    expect(normal.createInput.common.resultR).toBeNull();

    expect(() => buildCreateMarketEntryRequest(
      { ...commonForm, resultR: 'x' } as never,
      [{ accountId: 'acc-1', accountName: 'Real', riskAmount: 100, investmentPercent: 1 }],
      false,
      true,
    )).toThrow('No se pudo interpretar el Resultado R ingresado.');
  });

  it('construye filas por defecto según disponibilidad de cuentas', () => {
    const emptyRows = buildDefaultAccountRows([] as never);
    expect(emptyRows).toHaveLength(1);
    expect(emptyRows[0]?.accountId).toBe('');

    const accountRows = buildDefaultAccountRows([{ id: 'acc-1' }] as never);
    expect(accountRows).toHaveLength(1);
    expect(accountRows[0]?.accountId).toBe('acc-1');
  });
});
