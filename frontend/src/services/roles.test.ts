import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@lib/supabase';
import {
  assertCurrentUserIsAdmin,
  isAdminPermissionError,
  getCurrentUserRole,
  getCurrentUserProfile,
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
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'activity_logs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) } as any;
      }

      return {
        select: vi.fn(),
        update: vi.fn(),
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as any;
    });
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

  it('listAllUsers via RPC mapea email null a undefined', async () => {
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
              role_name: 'user',
              email: null,
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
    expect(users[0].email).toBeUndefined();
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

  it('isAdminPermissionError detecta correctamente', () => {
    const err = new Error('x');
    err.name = 'AdminPermissionError';
    expect(isAdminPermissionError(err)).toBe(true);
    expect(isAdminPermissionError(new Error('y'))).toBe(false);
  });

  it('assertCurrentUserIsAdmin no lanza en modo test', async () => {
    vi.stubEnv('MODE', 'test');
    await expect(assertCurrentUserIsAdmin()).resolves.toBeUndefined();
    vi.unstubAllEnvs();
  });

  it('assertCurrentUserIsAdmin lanza si rol no es admin', async () => {
    vi.stubEnv('MODE', 'production');
    (vi.mocked(supabase.rpc) as any).mockResolvedValueOnce({
      data: [{ role_name: 'user' }],
      error: null,
    });

    await expect(assertCurrentUserIsAdmin()).rejects.toThrow('Ya no tienes permisos de administrador');
    vi.unstubAllEnvs();
  });

  it('getCurrentUserRole retorna null si RPC devuelve rol desconocido y no hay usuario', async () => {
    (vi.mocked(supabase.rpc) as any).mockResolvedValueOnce({
      data: [{ role_name: 'unknown_role' }],
      error: null,
    });
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: null } as any,
      error: null,
    } as any);

    const result = await getCurrentUserRole();
    expect(result).toBeNull();
  });

  it('getCurrentUserRole retorna null cuando falla lookup de role', async () => {
    (vi.mocked(supabase.rpc) as any).mockResolvedValueOnce({ data: null, error: new Error('rpc fail') });
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: 'user-123' } as any } as any,
      error: null,
    } as any);

    vi.mocked(supabase.from)
      .mockReturnValueOnce({
        select: () => ({
          eq: async () => ({
            data: [{ role_id: 'role-1', status: 'active', updated_at: '2026-06-23' }],
            error: null,
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: new Error('role lookup fail') }),
          }),
        }),
      } as any);

    const result = await getCurrentUserRole();
    expect(result).toBeNull();
  });

  it('listAllUsers cae a fallback y lanza si query falla', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') return { data: [{ role_name: 'admin' }], error: null };
      if (fn === 'list_users_admin') return { data: null, error: new Error('rpc fail') };
      return { data: null, error: null };
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'activity_logs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) } as any;
      }

      if (table === 'user_profiles') {
        return {
          select: () => ({
            order: async () => ({ data: null, error: new Error('fallback fail') }),
          }),
        } as any;
      }

      return { select: vi.fn(), update: vi.fn(), insert: vi.fn() } as any;
    });

    await expect(listAllUsers()).rejects.toThrow('fallback fail');
  });

  it('updateUserStatus usa fallback y lanza error si update falla', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') return { data: [{ role_name: 'admin' }], error: null };
      if (fn === 'admin_update_user_profile') return { data: null, error: new Error('rpc fail') };
      return { data: null, error: null };
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'activity_logs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) } as any;
      }

      if (table === 'user_profiles') {
        return {
          update: () => ({
            eq: async () => ({ error: new Error('update fail') }),
          }),
        } as any;
      }

      return { select: vi.fn(), update: vi.fn(), insert: vi.fn() } as any;
    });

    await expect(updateUserStatus('user-1', 'active')).rejects.toThrow('update fail');
  });

  it('assignAdminRole usa fallback y falla si no encuentra rol admin', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') return { data: [{ role_name: 'admin' }], error: null };
      if (fn === 'admin_update_user_profile') return { data: null, error: new Error('rpc fail') };
      return { data: null, error: null };
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'activity_logs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) } as any;
      }

      if (table === 'roles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: new Error('role not found') }),
            }),
          }),
        } as any;
      }

      return { select: vi.fn(), update: vi.fn(), insert: vi.fn() } as any;
    });

    await expect(assignAdminRole('user-1')).rejects.toThrow('role not found');
  });

  it('removeAdminRole usa fallback y falla si no encuentra rol user', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') return { data: [{ role_name: 'admin' }], error: null };
      if (fn === 'admin_update_user_profile') return { data: null, error: new Error('rpc fail') };
      return { data: null, error: null };
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'activity_logs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) } as any;
      }

      if (table === 'roles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: new Error('user role missing') }),
            }),
          }),
        } as any;
      }

      return { select: vi.fn(), update: vi.fn(), insert: vi.fn() } as any;
    });

    await expect(removeAdminRole('user-1')).rejects.toThrow('user role missing');
  });

  it('getCurrentUserProfile lanza cuando getUser falla', async () => {
    vi.mocked(supabase.auth.getUser).mockRejectedValueOnce(new Error('auth fail') as any);
    await expect(getCurrentUserProfile()).rejects.toThrow('auth fail');
  });

  it('getCurrentUserRole usa fallback cuando rpc no existe', async () => {
    const originalRpc = (supabase as any).rpc;
    (supabase as any).rpc = undefined;

    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: 'user-123' } as any } as any,
      error: null,
    } as any);

    vi.mocked(supabase.from)
      .mockReturnValueOnce({
        select: () => ({
          eq: async () => ({
            data: [{ role_id: 'role-1', status: 'inactive', updated_at: '2020-01-01' }],
            error: null,
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        select: () => ({
          eq: () => ({ single: async () => ({ data: { id: 'role-1', name: 'user', description: 'User' }, error: null }) }),
        }),
      } as any);

    const result = await getCurrentUserRole();
    expect(result?.name).toBe('user');

    (supabase as any).rpc = originalRpc;
  });

  it('getCurrentUserRole prioriza perfil activo más reciente', async () => {
    (vi.mocked(supabase.rpc) as any).mockResolvedValueOnce({ data: null, error: new Error('rpc fail') });
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: 'user-123' } as any } as any,
      error: null,
    } as any);

    const roleEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValueOnce({ data: { id: 'role-admin', name: 'admin', description: 'Admin' }, error: null }),
    });

    vi.mocked(supabase.from)
      .mockReturnValueOnce({
        select: () => ({
          eq: async () => ({
            data: [
              { role_id: 'role-user', status: 'active', updated_at: '2020-01-01T00:00:00.000Z' },
              { role_id: 'role-admin', status: 'active', updated_at: '2026-01-01T00:00:00.000Z' },
            ],
            error: null,
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        select: () => ({
          eq: roleEq,
        }),
      } as any);

    const result = await getCurrentUserRole();
    expect(result?.name).toBe('admin');
    expect(roleEq).toHaveBeenCalledWith('id', 'role-admin');
  });

  it('getCurrentUserProfile retorna null cuando no hay user', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({ data: { user: null } as any, error: null } as any);
    await expect(getCurrentUserProfile()).resolves.toBeNull();
  });

  it('getCurrentUserProfile retorna null cuando query no trae data', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: 'user-123' } as any } as any,
      error: null,
    } as any);

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: () => ({
        eq: () => ({ single: async () => ({ data: null, error: null }) }),
      }),
    } as any);

    await expect(getCurrentUserProfile()).resolves.toBeNull();
  });

  it('listAllUsers usa fallback exitoso cuando RPC falla', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') return { data: [{ role_name: 'admin' }], error: null };
      if (fn === 'list_users_admin') return { data: null, error: new Error('rpc fail') };
      return { data: null, error: null };
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'activity_logs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) } as any;
      }

      if (table === 'user_profiles') {
        return {
          select: () => ({
            order: async () => ({
              data: [{ id: 'p1', user_id: 'u1', role_id: 'r1', status: 'active', created_at: 'x', updated_at: 'x', roles: { name: 'user' } }],
              error: null,
            }),
          }),
        } as any;
      }

      return { select: vi.fn(), update: vi.fn(), insert: vi.fn() } as any;
    });

    const users = await listAllUsers();
    expect(users).toHaveLength(1);
  });

  it('listAllUsers fallback retorna arreglo vacío cuando data es null y sin error', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') return { data: [{ role_name: 'admin' }], error: null };
      if (fn === 'list_users_admin') return { data: null, error: new Error('rpc fail') };
      return { data: null, error: null };
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'activity_logs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) } as any;
      }

      if (table === 'user_profiles') {
        return {
          select: () => ({
            order: async () => ({ data: null, error: null }),
          }),
        } as any;
      }

      return { select: vi.fn(), update: vi.fn(), insert: vi.fn() } as any;
    });

    const users = await listAllUsers();
    expect(users).toEqual([]);
  });

  it('assignAdminRole fallback lanza si falla update de perfil', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') return { data: [{ role_name: 'admin' }], error: null };
      if (fn === 'admin_update_user_profile') return { data: null, error: new Error('rpc fail') };
      return { data: null, error: null };
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'activity_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) } as any;

      if (table === 'roles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 'admin-role' }, error: null }),
            }),
          }),
        } as any;
      }

      if (table === 'user_profiles') {
        return {
          update: () => ({ eq: async () => ({ error: new Error('update profile fail') }) }),
        } as any;
      }

      return { select: vi.fn(), update: vi.fn(), insert: vi.fn() } as any;
    });

    await expect(assignAdminRole('user-1')).rejects.toThrow('update profile fail');
  });

  it('removeAdminRole fallback exitoso actualiza role_id', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') return { data: [{ role_name: 'admin' }], error: null };
      if (fn === 'admin_update_user_profile') return { data: null, error: new Error('rpc fail') };
      return { data: null, error: null };
    });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEq });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'activity_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) } as any;

      if (table === 'roles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 'user-role-id' }, error: null }),
            }),
          }),
        } as any;
      }

      if (table === 'user_profiles') {
        return {
          update: updateMock,
        } as any;
      }

      return { select: vi.fn(), update: vi.fn(), insert: vi.fn() } as any;
    });

    await expect(removeAdminRole('user-1')).resolves.toBeUndefined();
    expect(updateEq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('removeAdminRole fallback lanza si update de perfil falla', async () => {
    (vi.mocked(supabase.rpc) as any).mockImplementation(async (fn: string) => {
      if (fn === 'get_my_role') return { data: [{ role_name: 'admin' }], error: null };
      if (fn === 'admin_update_user_profile') return { data: null, error: new Error('rpc fail') };
      return { data: null, error: null };
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'activity_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) } as any;

      if (table === 'roles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 'user-role-id' }, error: null }),
            }),
          }),
        } as any;
      }

      if (table === 'user_profiles') {
        return {
          update: () => ({ eq: async () => ({ error: new Error('remove update fail') }) }),
        } as any;
      }

      return { select: vi.fn(), update: vi.fn(), insert: vi.fn() } as any;
    });

    await expect(removeAdminRole('user-1')).rejects.toThrow('remove update fail');
  });

  it('approveUserRegistration propaga error y entra en catch', async () => {
    (vi.mocked(supabase.rpc) as any).mockResolvedValueOnce({ data: [{ role_name: 'user' }], error: null });

    await expect(approveUserRegistration('user-1')).rejects.toThrow('Ya no tienes permisos de administrador');
  });

  it('rejectUserRegistration propaga error y entra en catch', async () => {
    (vi.mocked(supabase.rpc) as any).mockResolvedValueOnce({ data: [{ role_name: 'user' }], error: null });

    await expect(rejectUserRegistration('user-1')).rejects.toThrow('Ya no tienes permisos de administrador');
  });

  it('getCurrentUserRole retorna null si ocurre excepción inesperada', async () => {
    (vi.mocked(supabase.rpc) as any).mockResolvedValueOnce({ data: null, error: new Error('rpc fail') });
    vi.mocked(supabase.auth.getUser).mockRejectedValueOnce(new Error('boom') as any);

    await expect(getCurrentUserRole()).resolves.toBeNull();
  });
});
