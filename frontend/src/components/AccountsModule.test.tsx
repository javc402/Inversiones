import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountsModule from '@components/AccountsModule';
import * as accountsService from '@services/accounts';

const accountServiceMocks = vi.hoisted(() => ({
  listTradingAccounts: vi.fn(),
  createTradingAccount: vi.fn(),
  updateTradingAccount: vi.fn(),
  toggleTradingAccountStatus: vi.fn(),
  toggleTradingAccountFavorite: vi.fn(),
}));

vi.mock('@services/accounts', () => ({
  listTradingAccounts: accountServiceMocks.listTradingAccounts,
  createTradingAccount: accountServiceMocks.createTradingAccount,
  updateTradingAccount: accountServiceMocks.updateTradingAccount,
  toggleTradingAccountStatus: accountServiceMocks.toggleTradingAccountStatus,
  toggleTradingAccountFavorite: accountServiceMocks.toggleTradingAccountFavorite,
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
        is_favorite: false,
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

  it('filtra cuentas por búsqueda', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      {
        id: 'acc-1',
        user_id: 'user-1',
        name: 'Cuenta Principal',
        alias: 'CP',
        broker_name: 'Broker A',
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
        is_favorite: false,
        created_at: '2026-06-23T00:00:00.000Z',
        updated_at: '2026-06-23T00:00:00.000Z',
      },
      {
        id: 'acc-2',
        user_id: 'user-1',
        name: 'Cuenta Demo',
        alias: 'CD',
        broker_name: 'Broker B',
        account_type: 'demo',
        platform: 'mt5',
        base_currency: 'USD',
        leverage: '1:100',
        initial_balance: 5000,
        initial_equity: 5000,
        opened_at: '2026-06-23',
        status: 'inactive',
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
        is_favorite: false,
        created_at: '2026-06-23T00:00:00.000Z',
        updated_at: '2026-06-23T00:00:00.000Z',
      },
    ]);

    render(<AccountsModule />);

    expect(await screen.findByText('Cuenta Principal')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar cuentas'), { target: { value: 'Demo' } });

    expect(screen.queryByText('Cuenta Principal')).not.toBeInTheDocument();
    expect(screen.getByText('Cuenta Demo')).toBeInTheDocument();
  });

  it('abre modal de edición y actualiza cuenta', async () => {
    vi.mocked(accountsService.listTradingAccounts)
      .mockResolvedValueOnce([
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
          is_favorite: false,
          created_at: '2026-06-23T00:00:00.000Z',
          updated_at: '2026-06-23T00:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([]);
    vi.mocked(accountsService.updateTradingAccount).mockResolvedValueOnce();

    render(<AccountsModule />);

    fireEvent.click(await screen.findByRole('button', { name: 'Editar cuenta' }));
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Cuenta Principal Editada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cuenta' }));

    await waitFor(() => {
      expect(accountsService.updateTradingAccount).toHaveBeenCalled();
    });
  });

  it('activa/inactiva una cuenta', async () => {
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
        is_favorite: false,
        created_at: '2026-06-23T00:00:00.000Z',
        updated_at: '2026-06-23T00:00:00.000Z',
      },
    ]);
    vi.mocked(accountsService.toggleTradingAccountStatus).mockResolvedValueOnce('inactive');

    render(<AccountsModule />);
    fireEvent.click(await screen.findByRole('button', { name: 'Inactivar cuenta' }));

    await waitFor(() => {
      expect(accountsService.toggleTradingAccountStatus).toHaveBeenCalled();
    });
  });

  it('marca cuenta como favorita', async () => {
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
        is_favorite: false,
        created_at: '2026-06-23T00:00:00.000Z',
        updated_at: '2026-06-23T00:00:00.000Z',
      },
    ]);
    vi.mocked(accountsService.toggleTradingAccountFavorite).mockResolvedValueOnce(true);

    render(<AccountsModule />);
    fireEvent.click(await screen.findByRole('button', { name: 'Agregar a favoritos' }));

    await waitFor(() => {
      expect(accountsService.toggleTradingAccountFavorite).toHaveBeenCalled();
    });
  });

  it('muestra error cuando falla carga de cuentas', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockRejectedValueOnce(new Error('fail'));

    render(<AccountsModule />);

    expect(await screen.findByText('No fue posible cargar las cuentas.')).toBeInTheDocument();
  });

  it('filtra por tipo y estado', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([
      {
        id: 'acc-1',
        user_id: 'user-1',
        name: 'Real Activa',
        alias: 'RA',
        broker_name: 'Broker A',
        account_type: 'real',
        platform: 'mt5',
        base_currency: 'USD',
        leverage: '1:100',
        initial_balance: 1000,
        initial_equity: 1000,
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
        is_favorite: false,
        created_at: '2026-06-23T00:00:00.000Z',
        updated_at: '2026-06-23T00:00:00.000Z',
      },
      {
        id: 'acc-2',
        user_id: 'user-1',
        name: 'Demo Inactiva',
        alias: 'DI',
        broker_name: 'Broker B',
        account_type: 'demo',
        platform: 'mt5',
        base_currency: 'USD',
        leverage: '1:100',
        initial_balance: 1000,
        initial_equity: 1000,
        opened_at: '2026-06-23',
        status: 'inactive',
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
        is_favorite: false,
        created_at: '2026-06-23T00:00:00.000Z',
        updated_at: '2026-06-23T00:00:00.000Z',
      },
    ]);

    render(<AccountsModule />);

    expect(await screen.findByText('Real Activa')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filtrar por tipo'), { target: { value: 'demo' } });

    expect(screen.queryByText('Real Activa')).not.toBeInTheDocument();
    expect(screen.getByText('Demo Inactiva')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'active' } });
    expect(screen.queryByText('Demo Inactiva')).not.toBeInTheDocument();
  });

  it('cierra modal con cancelar y con tecla Escape', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([]);

    render(<AccountsModule />);

    fireEvent.click(await screen.findByRole('button', { name: '+ Nueva cuenta' }));
    expect(screen.getByRole('dialog', { name: 'Formulario cuenta' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Formulario cuenta' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '+ Nueva cuenta' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Formulario cuenta' })).not.toBeInTheDocument();
    });
  });

  it('crea cuenta funded con campos de fondeo', async () => {
    vi.mocked(accountsService.listTradingAccounts)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vi.mocked(accountsService.createTradingAccount).mockResolvedValueOnce();

    render(<AccountsModule />);

    fireEvent.click(await screen.findByRole('button', { name: '+ Nueva cuenta' }));

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Cuenta Fondeada' } });
    fireEvent.change(screen.getAllByRole('textbox')[2], { target: { value: 'Firma X' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '5000' } });

    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: 'funded' } });

    expect(await screen.findByText('Reglas de fondeo')).toBeInTheDocument();
    fireEvent.change(screen.getAllByRole('spinbutton')[4], { target: { value: '10' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cuenta' }));

    await waitFor(() => {
      expect(accountsService.createTradingAccount).toHaveBeenCalled();
    });
  });

  it('intenta guardar cuenta cuando el servicio falla', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([]);
    vi.mocked(accountsService.createTradingAccount).mockRejectedValue(new Error('save fail'));

    render(<AccountsModule />);

    fireEvent.click(await screen.findByRole('button', { name: '+ Nueva cuenta' }));
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Cuenta Error' } });
    fireEvent.change(screen.getAllByRole('textbox')[2], { target: { value: 'Broker Error' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '1000' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cuenta' }));

    await waitFor(() => {
      expect(accountsService.createTradingAccount).toHaveBeenCalled();
    });
    expect(accountsService.createTradingAccount).toHaveBeenCalledTimes(1);
  });

  it('muestra error cuando falla actualizar estado', async () => {
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
        is_favorite: false,
        created_at: '2026-06-23T00:00:00.000Z',
        updated_at: '2026-06-23T00:00:00.000Z',
      },
    ]);
    vi.mocked(accountsService.toggleTradingAccountStatus).mockRejectedValueOnce(new Error('status fail'));

    render(<AccountsModule />);
    fireEvent.click(await screen.findByRole('button', { name: 'Inactivar cuenta' }));

    expect(await screen.findByText('No fue posible actualizar el estado de la cuenta.')).toBeInTheDocument();
  });

  it('muestra error cuando falla actualizar favorito', async () => {
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
        is_favorite: false,
        created_at: '2026-06-23T00:00:00.000Z',
        updated_at: '2026-06-23T00:00:00.000Z',
      },
    ]);
    vi.mocked(accountsService.toggleTradingAccountFavorite).mockRejectedValueOnce(new Error('fav fail'));

    render(<AccountsModule />);
    fireEvent.click(await screen.findByRole('button', { name: 'Agregar a favoritos' }));

    expect(
      await screen.findByText('No fue posible actualizar el estado de favorito de la cuenta.')
    ).toBeInTheDocument();
  });

  it('muestra y oculta popovers de ayuda', async () => {
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
        is_favorite: false,
        created_at: '2026-06-23T00:00:00.000Z',
        updated_at: '2026-06-23T00:00:00.000Z',
      },
    ]);

    render(<AccountsModule />);

    const opsHeader = await screen.findByText('Ops');
    fireEvent.mouseEnter(opsHeader);
    expect(await screen.findByText('Número total de operaciones')).toBeInTheDocument();
    fireEvent.mouseLeave(opsHeader);

    fireEvent.click(screen.getByRole('button', { name: '+ Nueva cuenta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda: Nombre de la cuenta *' }));
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('dispara cambios en todos los campos del formulario', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([]);

    render(<AccountsModule />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Nueva cuenta' }));

    const dialog = screen.getByRole('dialog', { name: 'Formulario cuenta' });
    const typeSelect = dialog.querySelector('select') as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: 'funded' } });

    const fields = dialog.querySelectorAll('input, select, textarea');
    fields.forEach((field) => {
      if (field instanceof HTMLInputElement) {
        if (field.type === 'number') {
          fireEvent.change(field, { target: { value: '1' } });
        } else if (field.type === 'date') {
          fireEvent.change(field, { target: { value: '2026-06-29' } });
        } else {
          fireEvent.change(field, { target: { value: field.value || 'valor' } });
        }
      } else if (field instanceof HTMLSelectElement) {
        const option = field.options.length > 1 ? field.options[1].value : field.value;
        fireEvent.change(field, { target: { value: option } });
      } else if (field instanceof HTMLTextAreaElement) {
        fireEvent.change(field, { target: { value: 'nota de prueba' } });
      }
    });

    expect(screen.getByRole('button', { name: 'Guardar cuenta' })).toBeInTheDocument();
  });

  it('cierra popovers por click fuera y responde a resize/scroll', async () => {
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
        is_favorite: false,
        created_at: '2026-06-23T00:00:00.000Z',
        updated_at: '2026-06-23T00:00:00.000Z',
      },
    ]);

    render(<AccountsModule />);

    const opsHeader = await screen.findByText('Ops');
    fireEvent.click(opsHeader);
    expect(await screen.findByText('Número total de operaciones')).toBeInTheDocument();

    globalThis.dispatchEvent(new Event('resize'));
    globalThis.dispatchEvent(new Event('scroll'));
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Número total de operaciones')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '+ Nueva cuenta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda: Nombre de la cuenta *' }));
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    globalThis.dispatchEvent(new Event('resize'));
    globalThis.dispatchEvent(new Event('scroll'));
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('dispara onChange de campos funded no cubiertos', async () => {
    vi.mocked(accountsService.listTradingAccounts).mockResolvedValueOnce([]);

    render(<AccountsModule />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Nueva cuenta' }));

    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: 'funded' } });
    expect(await screen.findByText('Reglas de fondeo')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Fase desafío'), { target: { value: 'funded' } });
    fireEvent.change(screen.getByLabelText('Límite pérdida diaria %'), { target: { value: '4.5' } });
    fireEvent.change(screen.getByLabelText('Límite pérdida total %'), { target: { value: '9.5' } });
    fireEvent.change(screen.getByLabelText('Ciclo de pago'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('Observaciones'), { target: { value: 'nota funded' } });

    expect((screen.getByLabelText('Ciclo de pago') as HTMLSelectElement).value).toBe('custom');
    expect((screen.getByLabelText('Observaciones') as HTMLTextAreaElement).value).toBe('nota funded');
  });
});
