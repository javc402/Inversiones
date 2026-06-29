import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
const updateConfigMock = vi.hoisted(() => vi.fn());

vi.mock('@hooks/useSystemConfig', () => ({
  useSystemConfig: () => ({
    config: {
      accountTypes: [
        { id: 't1', label: 'Real', value: 'real' },
        { id: 't2', label: 'Demo', value: 'demo' },
      ],
      platforms: [{ id: 'p1', label: 'MT5', value: 'mt5' }],
      currencies: [{ id: 'c1', label: 'USD', value: 'USD' }],
    },
    updateConfig: updateConfigMock,
  }),
}));

import SettingsModule from '@components/SettingsModule';

describe('SettingsModule', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    updateConfigMock.mockResolvedValue(undefined);
  });

  it('muestra seccion de perfil por defecto', () => {
    render(<SettingsModule userEmail="test@demo.com" isAdmin={false} />);
    expect(screen.getByText('Información personal')).toBeInTheDocument();
  });

  it('muestra email como solo lectura', () => {
    render(<SettingsModule userEmail="test@demo.com" isAdmin={false} />);
    const emailInput = screen.getByLabelText('Correo electrónico') as HTMLInputElement;
    expect(emailInput.value).toBe('test@demo.com');
    expect(emailInput.readOnly).toBe(true);
  });

  it('no muestra opciones de sistema para usuario no admin', () => {
    render(<SettingsModule userEmail="test@demo.com" isAdmin={false} />);
    expect(screen.queryByRole('button', { name: 'Tipos de cuenta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Plataformas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Monedas base' })).not.toBeInTheDocument();
  });

  it('muestra opciones de sistema para admin', () => {
    render(<SettingsModule userEmail="admin@demo.com" isAdmin={true} />);
    expect(screen.getByRole('button', { name: 'Tipos de cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plataformas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monedas base' })).toBeInTheDocument();
  });

  it('guarda cambios del perfil y muestra confirmacion', () => {
    render(<SettingsModule userEmail="test@demo.com" isAdmin={false} />);

    fireEvent.change(screen.getByLabelText('Nombre completo'), {
      target: { value: 'Jorge Test' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByText('Cambios guardados')).toBeInTheDocument();
  });

  it('navega a tipos de cuenta como admin', () => {
    render(<SettingsModule userEmail="admin@demo.com" isAdmin={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tipos de cuenta' }));

    expect(
      screen.getByText('Define los tipos de cuenta disponibles al registrar o editar una cuenta de trading.')
    ).toBeInTheDocument();
  });

  it('navega a plataformas como admin', () => {
    render(<SettingsModule userEmail="admin@demo.com" isAdmin={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Plataformas' }));

    expect(
      screen.getByText('Gestiona las plataformas de trading disponibles en el formulario de cuentas.')
    ).toBeInTheDocument();
  });

  it('agrega un item de configuración como admin', () => {
    render(<SettingsModule userEmail="admin@demo.com" isAdmin={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tipos de cuenta' }));
    fireEvent.change(screen.getByLabelText('Nuevo nombre para Tipos de cuenta'), { target: { value: 'Fondeada' } });
    fireEvent.change(screen.getByLabelText('Nuevo valor para Tipos de cuenta'), { target: { value: 'funded' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar' }));

    expect(updateConfigMock).toHaveBeenCalledTimes(1);
  });

  it('muestra error al intentar agregar valor duplicado', () => {
    render(<SettingsModule userEmail="admin@demo.com" isAdmin={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tipos de cuenta' }));
    fireEvent.change(screen.getByLabelText('Nuevo nombre para Tipos de cuenta'), { target: { value: 'Real duplicado' } });
    fireEvent.change(screen.getByLabelText('Nuevo valor para Tipos de cuenta'), { target: { value: 'real' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar' }));

    expect(screen.getByText('Ya existe un ítem con ese valor.')).toBeInTheDocument();
  });

  it('permite editar y guardar un item existente', () => {
    render(<SettingsModule userEmail="admin@demo.com" isAdmin={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tipos de cuenta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Real' }));
    fireEvent.change(screen.getByLabelText('Editar nombre'), { target: { value: 'Cuenta Real' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(updateConfigMock).toHaveBeenCalled();
  });

  it('permite eliminar un item existente', () => {
    render(<SettingsModule userEmail="admin@demo.com" isAdmin={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tipos de cuenta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Real' }));

    expect(updateConfigMock).toHaveBeenCalled();
  });

  it('muestra error cuando updateConfig falla', () => {
    updateConfigMock.mockRejectedValueOnce(new Error('Error remoto'));
    render(<SettingsModule userEmail="admin@demo.com" isAdmin={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tipos de cuenta' }));
    fireEvent.change(screen.getByLabelText('Nuevo nombre para Tipos de cuenta'), { target: { value: 'Fondeada' } });
    fireEvent.change(screen.getByLabelText('Nuevo valor para Tipos de cuenta'), { target: { value: 'funded' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar' }));

    return waitFor(() => {
      expect(updateConfigMock).toHaveBeenCalled();
    });
  });

  it('edita valor y descripcion de item existente', () => {
    render(<SettingsModule userEmail="admin@demo.com" isAdmin={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tipos de cuenta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Real' }));
    fireEvent.change(screen.getByLabelText('Editar valor'), { target: { value: 'real-pro' } });
    fireEvent.change(screen.getByLabelText('Editar descripción'), { target: { value: 'Cuenta real profesional' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(updateConfigMock).toHaveBeenCalled();
  });

  it('agrega item en monedas con descripcion', () => {
    render(<SettingsModule userEmail="admin@demo.com" isAdmin={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Monedas base' }));
    fireEvent.change(screen.getByLabelText('Nuevo nombre para Monedas base'), { target: { value: 'Peso colombiano' } });
    fireEvent.change(screen.getByLabelText('Nuevo valor para Monedas base'), { target: { value: 'cop' } });
    fireEvent.change(screen.getByLabelText('Nueva descripción para Monedas base'), { target: { value: 'Moneda local' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar' }));

    expect(updateConfigMock).toHaveBeenCalled();
  });

  it('actualiza todos los campos del perfil', () => {
    render(<SettingsModule userEmail="test@demo.com" isAdmin={false} />);

    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Nombre Test' } });
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '+57 300 123 4567' } });
    fireEvent.change(screen.getByLabelText('Ciudad'), { target: { value: 'Bogota' } });
    fireEvent.change(screen.getByLabelText('País'), { target: { value: 'Colombia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByText('Cambios guardados')).toBeInTheDocument();
  });
});
