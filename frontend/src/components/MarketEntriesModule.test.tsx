import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import MarketEntriesModule from './MarketEntriesModule';
import * as marketEntriesService from '@services/market-entries';
import * as accountsService from '@services/accounts';

vi.mock('@services/market-entries');
vi.mock('@services/accounts');
vi.mock('@services/audit');
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return { ...actual, createPortal: (el: React.ReactNode) => el };
});

describe('MarketEntriesModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(marketEntriesService.listMarketEntriesByUser).mockResolvedValue([]);
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValue([]);
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

});
