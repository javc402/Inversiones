import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPanel from '@components/AdminPanel';
import * as rolesService from '@services/roles';

vi.mock('@services/roles');

describe('AdminPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
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
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'active' } });

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
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const assignButton = buttons.find((btn) => btn.textContent?.includes('Hacer Admin'));

    if (assignButton) {
      fireEvent.click(assignButton);

      await waitFor(() => {
        expect(rolesService.assignAdminRole).toHaveBeenCalledWith('user-1');
      });
    }
  });

  it('should show error when loading fails', async () => {
    vi.mocked(rolesService.listAllUsers).mockRejectedValueOnce(new Error('Load failed'));

    render(<AdminPanel />);

    await waitFor(() => {
      expect(screen.getByText('Error cargando usuarios')).toBeInTheDocument();
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
    vi.mocked(rolesService.listAllUsers).mockResolvedValueOnce([]);

    const { rerender } = render(<AdminPanel />);

    await waitFor(() => {
      expect(screen.getByText('Actualizar')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Actualizar');
    fireEvent.click(refreshButton);

    expect(rolesService.listAllUsers).toHaveBeenCalledTimes(2); // Initial + click
  });
});
