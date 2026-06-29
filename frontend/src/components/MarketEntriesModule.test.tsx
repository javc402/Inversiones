import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import MarketEntriesModule from './MarketEntriesModule';
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
      expect(selects.length).toBe(2);
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

});
