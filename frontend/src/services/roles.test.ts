import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@lib/supabase';
import {
  getCurrentUserRole,
  listAllUsers,
  updateUserStatus,
  assignAdminRole,
  removeAdminRole,
  approveUserRegistration,
  rejectUserRegistration,
} from '@services/roles';

vi.mock('@lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn().mockResolvedValue({
      data: null,
      error: new Error('RPC not mocked'),
    }),
    from: vi.fn(),
  },
}));

describe('Roles Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentUserRole', () => {
    it('should return null if user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null } as any,
        error: null,
      } as any);

      const result = await getCurrentUserRole();
      expect(result).toBeNull();
    });

    it('should return user role when authenticated', async () => {
      const mockUser = { id: 'user-123' };
      const mockRole = { id: 'role-123', name: 'admin', description: 'Admin' };

      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: mockUser as any } as any,
        error: null,
      } as any);

      // Primera query: obtener role_id del perfil
      const mockSelectProfile = vi.fn().mockReturnThis();
      const mockEqProfile = vi.fn().mockResolvedValueOnce({
        data: [{ role_id: 'role-123', status: 'active', updated_at: '2026-06-23T00:00:00.000Z' }],
        error: null,
      });

      // Segunda query: obtener el rol por id
      const mockSelectRole = vi.fn().mockReturnThis();
      const mockEqRole = vi.fn().mockReturnThis();
      const mockSingleRole = vi.fn().mockResolvedValueOnce({
        data: mockRole,
        error: null,
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: mockSelectProfile,
        } as any)
        .mockReturnValueOnce({
          select: mockSelectRole,
        } as any);

      mockSelectProfile.mockReturnValueOnce({ eq: mockEqProfile });

      mockSelectRole.mockReturnValueOnce({ eq: mockEqRole });
      mockEqRole.mockReturnValueOnce({ single: mockSingleRole });

      const result = await getCurrentUserRole();
      expect(result).toEqual(mockRole);
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValueOnce({ error: null });

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: mockUpdate,
      } as any);

      mockUpdate.mockReturnValueOnce({
        eq: mockEq,
      });

      await updateUserStatus('user-123', 'active');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should throw error on failure', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValueOnce({
        error: new Error('Database error'),
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: mockUpdate,
      } as any);

      mockUpdate.mockReturnValueOnce({
        eq: mockEq,
      });

      await expect(updateUserStatus('user-123', 'active')).rejects.toThrow();
    });
  });

  describe('approveUserRegistration', () => {
    it('should approve user registration by setting status to active', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValueOnce({ error: null });

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: mockUpdate,
      } as any);

      mockUpdate.mockReturnValueOnce({
        eq: mockEq,
      });

      await approveUserRegistration('user-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
    });
  });

  describe('rejectUserRegistration', () => {
    it('should reject user registration by setting status to inactive', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValueOnce({ error: null });

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: mockUpdate,
      } as any);

      mockUpdate.mockReturnValueOnce({
        eq: mockEq,
      });

      await rejectUserRegistration('user-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'inactive' })
      );
    });
  });

  describe('assignAdminRole', () => {
    it('should assign admin role to user', async () => {
      const mockAdminRole = { id: 'admin-role-id' };

      const mockSelectRoles = vi.fn().mockReturnThis();
      const mockEqRole = vi.fn().mockReturnThis();
      const mockSingleRole = vi
        .fn()
        .mockResolvedValueOnce({
          data: mockAdminRole,
          error: null,
        });

      const mockUpdateUser = vi.fn().mockReturnThis();
      const mockEqUser = vi.fn().mockResolvedValueOnce({ error: null });

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: mockSelectRoles,
        } as any)
        .mockReturnValueOnce({
          update: mockUpdateUser,
        } as any);

      mockSelectRoles.mockReturnValueOnce({
        eq: mockEqRole,
      });

      mockEqRole.mockReturnValueOnce({
        single: mockSingleRole,
      });

      mockUpdateUser.mockReturnValueOnce({
        eq: mockEqUser,
      });

      await assignAdminRole('user-123');

      expect(mockUpdateUser).toHaveBeenCalledWith(
        expect.objectContaining({ role_id: 'admin-role-id' })
      );
      expect(mockEqUser).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });
});

describe('Roles Service coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('MODE', 'production');
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'audit-user-1' } as any },
      error: null,
    } as any);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'activity_logs') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        } as never;
      }

      return {
        select: vi.fn(),
        update: vi.fn(),
        insert: vi.fn(),
      } as never;
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('getCurrentUserRole usa la ruta RPC cuando está disponible', async () => {
    (vi.mocked(supabase.rpc) as any).mockResolvedValueOnce({
      data: [{ role_name: 'admin' }],
      error: null,
    });

    const result = await getCurrentUserRole();

    expect(result).toEqual({
      id: 'admin',
      name: 'admin',
      description: 'Administrador del sistema',
    });
  });

  it('getCurrentUserProfile devuelve el perfil actual', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: 'user-123' } as any },
      error: null,
    } as any);

    vi.mocked(supabase.from).mockReturnValueOnce(
      {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: 'profile-1',
                user_id: 'user-123',
                role_id: 'role-1',
                status: 'active',
                created_at: '2026-06-23',
                updated_at: '2026-06-23',
              },
              error: null,
            }),
          }),
        }),
      } as never
    );

    const profile = await (await import('@services/roles')).getCurrentUserProfile();

    expect(profile?.user_id).toBe('user-123');
  });

  it('listAllUsers usa RPC cuando existe y el usuario es admin', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') {
        return { data: [{ role_name: 'admin' }], error: null };
      }

      if (fn === 'list_users_admin') {
        return {
          data: [
            {
              id: 'profile-1',
              user_id: 'user-123',
              role_id: 'role-1',
              role_name: 'admin',
              email: 'admin@example.com',
              status: 'active',
              created_at: '2026-06-23',
              updated_at: '2026-06-23',
            },
          ],
          error: null,
        };
      }

      return { data: null, error: null };
    });

    const users = await listAllUsers();

    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('admin@example.com');
  });

  it('updateUserStatus usa RPC cuando existe', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') {
        return { data: [{ role_name: 'admin' }], error: null };
      }

      if (fn === 'admin_update_user_profile') {
        return { data: null, error: null };
      }

      return { data: null, error: null };
    });

    await updateUserStatus('user-123', 'inactive');

    expect(supabase.rpc).toHaveBeenCalledWith(
      'admin_update_user_profile',
      expect.objectContaining({
        target_user_id: 'user-123',
        new_status: 'inactive',
      })
    );
  });

  it('assignAdminRole usa RPC cuando existe', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') {
        return { data: [{ role_name: 'admin' }], error: null };
      }

      if (fn === 'admin_update_user_profile') {
        return { data: null, error: null };
      }

      return { data: null, error: null };
    });

    await assignAdminRole('user-123');

    expect(supabase.rpc).toHaveBeenCalledWith(
      'admin_update_user_profile',
      expect.objectContaining({
        target_user_id: 'user-123',
        new_role_name: 'admin',
      })
    );
  });

  it('removeAdminRole usa RPC cuando existe', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') {
        return { data: [{ role_name: 'admin' }], error: null };
      }

      if (fn === 'admin_update_user_profile') {
        return { data: null, error: null };
      }

      return { data: null, error: null };
    });

    await removeAdminRole('user-123');

    expect(supabase.rpc).toHaveBeenCalledWith(
      'admin_update_user_profile',
      expect.objectContaining({
        target_user_id: 'user-123',
        new_role_name: 'user',
      })
    );
  });

  it('approveUserRegistration delega en updateUserStatus', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') {
        return { data: [{ role_name: 'admin' }], error: null };
      }

      if (fn === 'admin_update_user_profile') {
        return { data: null, error: null };
      }

      return { data: null, error: null };
    });

    await approveUserRegistration('user-123');

    expect(supabase.rpc).toHaveBeenCalledWith(
      'admin_update_user_profile',
      expect.objectContaining({
        target_user_id: 'user-123',
        new_status: 'active',
      })
    );
  });

  it('rejectUserRegistration delega en updateUserStatus', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') {
        return { data: [{ role_name: 'admin' }], error: null };
      }

      if (fn === 'admin_update_user_profile') {
        return { data: null, error: null };
      }

      return { data: null, error: null };
    });

    await rejectUserRegistration('user-123');

    expect(supabase.rpc).toHaveBeenCalledWith(
      'admin_update_user_profile',
      expect.objectContaining({
        target_user_id: 'user-123',
        new_status: 'inactive',
      })
    );
  });
});
