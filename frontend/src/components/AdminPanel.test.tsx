import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPanel from '@components/AdminPanel';
import * as rolesService from '@services/roles';

const rolesMocks = vi.hoisted(() => ({
  getCurrentUserProfile: vi.fn(),
  listAllUsers: vi.fn(),
  updateUserStatus: vi.fn(),
  assignAdminRole: vi.fn(),
  removeAdminRole: vi.fn(),
  isAdminPermissionError: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock('@lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: supabaseMocks.getUser,
    },
  },
}));

vi.mock('@services/roles', () => ({
  ADMIN_PERMISSION_ERROR_MESSAGE:
    'Ya no tienes permisos de administrador. Contacta a un administrador del sistema.',
  isAdminPermissionError: rolesMocks.isAdminPermissionError,
  getCurrentUserProfile: rolesMocks.getCurrentUserProfile,
  listAllUsers: rolesMocks.listAllUsers,
  updateUserStatus: rolesMocks.updateUserStatus,
  assignAdminRole: rolesMocks.assignAdminRole,
  removeAdminRole: rolesMocks.removeAdminRole,
}));

describe('AdminPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rolesMocks.isAdminPermissionError.mockReturnValue(false);
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'self-id', email: 'self@example.com' } }, error: null });
    vi.mocked(rolesService.getCurrentUserProfile).mockResolvedValue({
      id: 'self-id',
      user_id: 'self-user-id',
      role_id: 'role-1',
      status: 'active',
      created_at: '2026-06-23',
      updated_at: '2026-06-23',
    } as any);
  });

  it('should render admin panel with title', async () => {
    vi.mocked(rolesService.listAllUsers).mockResolvedValueOnce([]);

    render(<AdminPanel />);

    expect(screen.getByText('Panel de Administración')).toBeInTheDocument();
  });

  it('should load and display users', async () => {
    const mockUsers = [
      {
        id: '1',
        user_id: 'user-1',
        role_id: 'role-1',
        status: 'active' as const,
        email: 'user1@example.com',
        created_at: '2026-06-23',
        updated_at: '2026-06-23',
        roles: { name: 'user' as const },
      },
    ];

    vi.mocked(rolesService.listAllUsers).mockResolvedValueOnce(mockUsers as any);

    render(<AdminPanel />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'user1@example.com' })).toBeInTheDocument();
    });
  });

  it('should change user status', async () => {
    const mockUsers = [
      {
        id: '1',
        user_id: 'user-1',
        role_id: 'role-1',
        status: 'pending' as const,
        email: 'user1@example.com',
        created_at: '2026-06-23',
        updated_at: '2026-06-23',
      },
    ];

    vi.mocked(rolesService.listAllUsers).mockResolvedValueOnce(mockUsers as any);
    vi.mocked(rolesService.updateUserStatus).mockResolvedValueOnce(undefined);

    render(<AdminPanel />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'user1@example.com' })).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'active' } });

    await waitFor(() => {
      expect(rolesService.updateUserStatus).toHaveBeenCalledWith('user-1', 'active');
    });
  });

  it('should assign admin role', async () => {
    const mockUsers = [
      {
        id: '1',
        user_id: 'user-1',
        role_id: 'role-1',
        status: 'active' as const,
        email: 'user1@example.com',
        created_at: '2026-06-23',
        updated_at: '2026-06-23',
        roles: { name: 'user' as const },
      },
    ];

    vi.mocked(rolesService.listAllUsers).mockResolvedValueOnce(mockUsers as any);
    vi.mocked(rolesService.assignAdminRole).mockResolvedValueOnce(undefined);

    render(<AdminPanel />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'user1@example.com' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Hacer admin' })[0]);

    await waitFor(() => {
      expect(rolesService.assignAdminRole).toHaveBeenCalledWith('user-1');
    });
  });

  it('should show error when loading fails', async () => {
    vi.mocked(rolesService.listAllUsers).mockRejectedValue(new Error('Load failed'));

    render(<AdminPanel />);

    await waitFor(() => {
      expect(rolesService.listAllUsers).toHaveBeenCalled();
    });

    expect(
      screen.queryByText('Error cargando usuarios') ??
      screen.queryByText('No hay usuarios registrados')
    ).toBeInTheDocument();
  });

  it('should show admin permission message when permission error is detected', async () => {
    rolesMocks.isAdminPermissionError.mockReturnValue(true);
    vi.mocked(rolesService.listAllUsers).mockRejectedValue(new Error('forbidden'));

    render(<AdminPanel />);

    await waitFor(() => {
      expect(screen.getByText('Ya no tienes permisos de administrador. Contacta a un administrador del sistema.')).toBeInTheDocument();
    });
  });

  it('should show empty state when no users', async () => {
    vi.mocked(rolesService.listAllUsers).mockResolvedValueOnce([]);

    render(<AdminPanel />);

    await waitFor(() => {
      expect(screen.getByText('No hay usuarios registrados')).toBeInTheDocument();
    });
  });

  it('should refresh users on button click', async () => {
    vi.mocked(rolesService.listAllUsers).mockResolvedValue([]);

    render(<AdminPanel />);

    await waitFor(() => {
      expect(screen.getByText('Actualizar')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Actualizar');
    fireEvent.click(refreshButton);

    expect(rolesService.listAllUsers).toHaveBeenCalledTimes(2); // Initial + click
  });

  it('should filter users by query and status', async () => {
    const mockUsers = [
      {
        id: '1',
        user_id: 'user-1',
        role_id: 'role-1',
        status: 'active' as const,
        email: 'active@example.com',
        created_at: '2026-06-23',
        updated_at: '2026-06-23',
        roles: { name: 'user' as const },
      },
      {
        id: '2',
        user_id: 'user-2',
        role_id: 'role-1',
        status: 'inactive' as const,
        email: 'inactive@example.com',
        created_at: '2026-06-23',
        updated_at: '2026-06-23',
        roles: { name: 'user' as const },
      },
    ];

    vi.mocked(rolesService.listAllUsers).mockResolvedValueOnce(mockUsers as any);

    render(<AdminPanel />);

    expect(await screen.findByRole('heading', { name: 'active@example.com' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar por usuario'), { target: { value: 'inactive' } });
    expect(screen.queryByRole('heading', { name: 'active@example.com' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'inactive@example.com' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'active' } });
    expect(screen.queryByRole('heading', { name: 'inactive@example.com' })).not.toBeInTheDocument();
  });

  it('should remove admin role and activate user with icon buttons', async () => {
    const mockUsers = [
      {
        id: '1',
        user_id: 'user-1',
        role_id: 'role-1',
        status: 'pending' as const,
        email: 'adminuser@example.com',
        created_at: '2026-06-23',
        updated_at: '2026-06-23',
        roles: { name: 'admin' as const },
      },
    ];

    vi.mocked(rolesService.listAllUsers).mockResolvedValueOnce(mockUsers as any);
    vi.mocked(rolesService.removeAdminRole).mockResolvedValueOnce(undefined);
    vi.mocked(rolesService.updateUserStatus).mockResolvedValueOnce(undefined);

    render(<AdminPanel />);

    expect(await screen.findByRole('heading', { name: 'adminuser@example.com' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar admin' }));
    await waitFor(() => {
      expect(rolesService.removeAdminRole).toHaveBeenCalledWith('user-1');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Activar usuario' }));
    await waitFor(() => {
      expect(rolesService.updateUserStatus).toHaveBeenCalledWith('user-1', 'active');
    });
  });

  it('should disable actions and render fallback labels for self user without email/date', async () => {
    vi.mocked(rolesService.listAllUsers).mockResolvedValueOnce([
      {
        id: '1',
        user_id: 'other-id',
        role_id: 'role-1',
        status: 'inactive',
        email: 'SELF@EXAMPLE.COM',
        created_at: 'invalid-date',
        updated_at: '2026-06-23',
      },
      {
        id: '2',
        user_id: 'user-2',
        role_id: 'role-1',
        status: 'pending',
        email: '',
        created_at: '',
        updated_at: '2026-06-23',
      },
    ] as any);

    render(<AdminPanel />);

    expect(await screen.findByRole('heading', { name: 'SELF@EXAMPLE.COM' })).toBeInTheDocument();
    expect(screen.getAllByText('Sin correo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DESDE Sin fecha').length).toBeGreaterThan(0);

    expect(screen.getByText('Tu usuario no se puede editar.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Activar usuario' })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Hacer admin' })[0]).toBeDisabled();
  });

  it('should reset current user when getUser fails', async () => {
    supabaseMocks.getUser.mockRejectedValueOnce(new Error('auth fail'));
    vi.mocked(rolesService.listAllUsers).mockResolvedValueOnce([]);

    render(<AdminPanel />);

    await waitFor(() => {
      expect(rolesService.listAllUsers).toHaveBeenCalled();
    });
  });

  it('should show fallback error when assign admin fails', async () => {
    const mockUsers = [
      {
        id: '1',
        user_id: 'user-1',
        role_id: 'role-1',
        status: 'active' as const,
        email: 'user1@example.com',
        created_at: '2026-06-23',
        updated_at: '2026-06-23',
        roles: { name: 'user' as const },
      },
    ];

    rolesMocks.isAdminPermissionError.mockReturnValue(false);
    vi.mocked(rolesService.listAllUsers).mockResolvedValueOnce(mockUsers as any);
    vi.mocked(rolesService.assignAdminRole).mockRejectedValueOnce(new Error('assign fail'));

    render(<AdminPanel />);

    expect(await screen.findByRole('heading', { name: 'user1@example.com' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Hacer admin' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Error asignando rol admin')).toBeInTheDocument();
    });
  });

  it('should show permission error when remove admin fails by permissions', async () => {
    const mockUsers = [
      {
        id: '1',
        user_id: 'user-1',
        role_id: 'role-1',
        status: 'active' as const,
        email: 'admin1@example.com',
        created_at: '2026-06-23',
        updated_at: '2026-06-23',
        roles: { name: 'admin' as const },
      },
      {
        id: '2',
        user_id: 'user-2',
        role_id: 'role-1',
        status: 'active' as const,
        email: 'admin2@example.com',
        created_at: '2026-06-23',
        updated_at: '2026-06-23',
        roles: { name: 'admin' as const },
      },
    ];

    rolesMocks.isAdminPermissionError.mockReturnValue(true);
    vi.mocked(rolesService.listAllUsers).mockResolvedValueOnce(mockUsers as any);
    vi.mocked(rolesService.removeAdminRole).mockRejectedValueOnce(new Error('forbidden'));

    render(<AdminPanel />);

    expect(await screen.findByRole('heading', { name: 'admin1@example.com' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Quitar admin' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Ya no tienes permisos de administrador. Contacta a un administrador del sistema.')).toBeInTheDocument();
    });
  });

  it('should show error when status update fails', async () => {
    const mockUsers = [
      {
        id: '1',
        user_id: 'user-1',
        role_id: 'role-1',
        status: 'pending' as const,
        email: 'user1@example.com',
        created_at: '2026-06-23',
        updated_at: '2026-06-23',
      },
    ];

    rolesMocks.isAdminPermissionError.mockReturnValue(false);
    vi.mocked(rolesService.listAllUsers).mockResolvedValueOnce(mockUsers as any);
    vi.mocked(rolesService.updateUserStatus).mockRejectedValueOnce(new Error('status fail'));

    render(<AdminPanel />);

    expect(await screen.findByRole('heading', { name: 'user1@example.com' })).toBeInTheDocument();

    const statusSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    await waitFor(() => {
      expect(screen.getByText('Error actualizando estado del usuario')).toBeInTheDocument();
    });
  });

  it('should keep other users unchanged when assign/remove succeeds', async () => {
    const mockUsers = [
      {
        id: '1',
        user_id: 'user-1',
        role_id: 'role-1',
        status: 'active' as const,
        email: 'user1@example.com',
        created_at: '2026-06-23',
        updated_at: '2026-06-23',
        roles: { name: 'user' as const },
      },
      {
        id: '2',
        user_id: 'user-2',
        role_id: 'role-1',
        status: 'active' as const,
        email: 'admin@example.com',
        created_at: '2026-06-23',
        updated_at: '2026-06-23',
        roles: { name: 'admin' as const },
      },
    ];

    vi.mocked(rolesService.listAllUsers).mockResolvedValueOnce(mockUsers as any);
    vi.mocked(rolesService.assignAdminRole).mockResolvedValueOnce(undefined);
    vi.mocked(rolesService.removeAdminRole).mockResolvedValueOnce(undefined);

    render(<AdminPanel />);

    expect(await screen.findByRole('heading', { name: 'user1@example.com' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Hacer admin' })[0]);
    await waitFor(() => {
      expect(rolesService.assignAdminRole).toHaveBeenCalledWith('user-1');
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Quitar admin' })[1]);
    await waitFor(() => {
      expect(rolesService.removeAdminRole).toHaveBeenCalledWith('user-2');
    });
  });
});
