import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountsModule from '@components/AccountsModule';
import * as accountsService from '@services/accounts';

const accountServiceMocks = vi.hoisted(() => ({
  listTradingAccounts: vi.fn(),
  createTradingAccount: vi.fn(),
  updateTradingAccount: vi.fn(),
  toggleTradingAccountStatus: vi.fn(),
}));

vi.mock('@services/accounts', () => ({
  listTradingAccounts: accountServiceMocks.listTradingAccounts,
  createTradingAccount: accountServiceMocks.createTradingAccount,
  updateTradingAccount: accountServiceMocks.updateTradingAccount,
  toggleTradingAccountStatus: accountServiceMocks.toggleTradingAccountStatus,
}));

describe('AccountsModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza estado vacio cuando no hay cuentas', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([]);

    render(<AccountsModule />);

    expect(await screen.findByText('Aun no tienes cuentas registradas.')).toBeInTheDocument();
  });

  it('muestra cuentas en cards', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      {
        id: 'acc-1',
        user_id: 'user-1',
        name: 'Cuenta Principal',
        alias: 'CP',
        broker_name: 'IC Markets',
        account_type: 'real',
        platform: 'mt5',
        base_currency: 'USD',
        leverage: '1:100',
        initial_balance: 10000,
        initial_equity: 10000,
        opened_at: '2026-06-23',
        status: 'active',
        risk_per_trade_pct: 1,
        max_daily_risk_pct: 3,
        max_drawdown_pct: 8,
        funding_firm: null,
        challenge_phase: null,
        profit_target_pct: null,
        daily_loss_limit_pct: null,
        max_loss_limit_pct: null,
        payout_cycle: null,
        notes: null,
        created_at: '2026-06-23T00:00:00.000Z',
        updated_at: '2026-06-23T00:00:00.000Z',
      },
    ]);

    render(<AccountsModule />);

    expect(await screen.findByText('Cuenta Principal')).toBeInTheDocument();
    expect(screen.getByText('IC Markets')).toBeInTheDocument();
  });

  it('abre popup de crear cuenta', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([]);

    render(<AccountsModule />);

    fireEvent.click(await screen.findByRole('button', { name: '+ Nueva cuenta' }));

    expect(screen.getByRole('dialog', { name: 'Formulario cuenta' })).toBeInTheDocument();
    expect(screen.getByText('Crear cuenta')).toBeInTheDocument();
  });

  it('crea cuenta desde popup', async () => {
    vi.mocked(accountsService.listTradingAccounts)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vi.mocked(accountsService.createTradingAccount).mockResolvedValueOnce();

    render(<AccountsModule />);

    fireEvent.click(await screen.findByRole('button', { name: '+ Nueva cuenta' }));

    const textboxes = screen.getAllByRole('textbox');
    const nameInput = textboxes[0];
    const aliasInput = textboxes[1];
    const brokerInput = textboxes[2];
    const numericInputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    const balanceInput = numericInputs[0];

    fireEvent.change(nameInput, { target: { value: 'Cuenta Nueva' } });
    fireEvent.change(aliasInput, { target: { value: 'CN' } });
    fireEvent.change(brokerInput, { target: { value: 'Broker X' } });
    fireEvent.change(balanceInput, { target: { value: '1200' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cuenta' }));

    await waitFor(() => {
      expect(accountsService.createTradingAccount).toHaveBeenCalled();
    });
  });
});
