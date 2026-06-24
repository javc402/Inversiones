import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsModule from '@components/SettingsModule';

describe('SettingsModule', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
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
});
