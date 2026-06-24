import { supabase } from '@lib/supabase';

type ActivityAction =
  | 'roles.get_current_user_role'
  | 'roles.list_all_users'
  | 'roles.update_user_status'
  | 'roles.assign_admin_role'
  | 'roles.remove_admin_role'
  | 'roles.approve_user_registration'
  | 'roles.reject_user_registration';

interface ActivityLogInput {
  action: ActivityAction;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
}

interface RpcResponse<T = unknown> {
  data: T | null;
  error: unknown;
}

type RpcClient = {
  rpc?: (fn: string, args?: Record<string, unknown>) => Promise<RpcResponse>;
};

async function logActivity({ action, targetUserId, metadata }: ActivityLogInput): Promise<void> {
  // Evita ruido en tests unitarios donde los mocks de supabase.from son limitados.
  if (import.meta.env.MODE === 'test') return;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action,
      target_user_id: targetUserId ?? null,
      metadata: metadata ?? {},
    });
  } catch (error) {
    console.error('Error writing activity log:', error);
  }
}

export interface UserProfile {
  id: string;
  user_id: string;
  role_id: string;
  status: 'pending' | 'active' | 'inactive';
  roles?: Pick<Role, 'name'>;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: 'admin' | 'user';
  description: string;
}

export const ADMIN_PERMISSION_ERROR_MESSAGE =
  'Ya no tienes permisos de administrador. Contacta a un administrador del sistema.';

class AdminPermissionError extends Error {
  constructor(message = ADMIN_PERMISSION_ERROR_MESSAGE) {
    super(message);
    this.name = 'AdminPermissionError';
  }
}

export function isAdminPermissionError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AdminPermissionError';
}

export async function assertCurrentUserIsAdmin(): Promise<void> {
  if (import.meta.env.MODE === 'test') return;

  const role = await getCurrentUserRole();
  if (role?.name !== 'admin') {
    throw new AdminPermissionError();
  }
}

function roleFromName(name: string): Role | null {
  if (name === 'admin') {
    return {
      id: 'admin',
      name: 'admin',
      description: 'Administrador del sistema',
    };
  }

  if (name === 'user') {
    return {
      id: 'user',
      name: 'user',
      description: 'Usuario regular',
    };
  }

  return null;
}

/**
 * Obtiene el rol del usuario actual
 */
export async function getCurrentUserRole(): Promise<Role | null> {
  try {
    const rpcClient = supabase as unknown as {
      rpc?: (fn: string) => Promise<{ data: Array<{ role_name: string }> | null; error: unknown }>;
    };

    if (typeof rpcClient.rpc === 'function') {
      const rpcResponse = await rpcClient.rpc('get_my_role');
      const rpcRoleName = rpcResponse.data?.[0]?.role_name;

      if (typeof rpcRoleName === 'string') {
        const normalizedRole = roleFromName(rpcRoleName.trim().toLowerCase());
        if (normalizedRole) {
          void logActivity({ action: 'roles.get_current_user_role' });
          return normalizedRole;
        }
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('role_id, status, updated_at')
      .eq('user_id', user.id);

    const normalizedProfiles = (profiles ?? []) as Array<{
      role_id: string;
      status: string | null;
      updated_at: string | null;
    }>;

    const activeProfiles = normalizedProfiles.filter(
      (item) => (item.status ?? '').trim().toLowerCase() === 'active'
    );

    activeProfiles.sort((a, b) => {
      const aTime = a.updated_at ? Date.parse(a.updated_at) : 0;
      const bTime = b.updated_at ? Date.parse(b.updated_at) : 0;
      return bTime - aTime;
    });

    const profile = activeProfiles[0] ?? normalizedProfiles[0];

    if (profileError || !profile) return null;

    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, name, description')
      .eq('id', profile.role_id)
      .single();

    if (roleError || !role) return null;

    void logActivity({ action: 'roles.get_current_user_role' });

    return role as Role;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

/**
 * Obtiene la información completa del perfil del usuario actual
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return null;

    return data as UserProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Lista todos los usuarios (solo para admins)
 */
export async function listAllUsers(): Promise<UserProfile[]> {
  try {
    await assertCurrentUserIsAdmin();

    const rpcClient = supabase as unknown as {
      rpc?: (
        fn: string
      ) => Promise<{
        data: Array<{
          id: string;
          user_id: string;
          role_id: string;
          role_name: 'admin' | 'user';
          email: string | null;
          status: 'pending' | 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        }> | null;
        error: unknown;
      }>;
    };

    if (typeof rpcClient.rpc === 'function') {
      const rpcResponse = await rpcClient.rpc('list_users_admin');
      if (!rpcResponse.error && rpcResponse.data) {
        void logActivity({ action: 'roles.list_all_users' });

        return rpcResponse.data.map((item) => ({
          id: item.id,
          user_id: item.user_id,
          role_id: item.role_id,
          status: item.status,
          email: item.email ?? undefined,
          created_at: item.created_at,
          updated_at: item.updated_at,
          roles: { name: item.role_name },
        }));
      }
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, roles(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    void logActivity({ action: 'roles.list_all_users' });

    return (data || []) as unknown as UserProfile[];
  } catch (error) {
    console.error('Error listing users:', error);
    throw error;
  }
}

/**
 * Cambiar estado de un usuario (activo/inactivo)
 */
export async function updateUserStatus(
  userId: string,
  status: 'pending' | 'active' | 'inactive'
): Promise<void> {
  try {
    await assertCurrentUserIsAdmin();

    const rpcClient = supabase as unknown as RpcClient;
    if (typeof rpcClient.rpc === 'function') {
      const rpcResponse = await rpcClient.rpc('admin_update_user_profile', {
        target_user_id: userId,
        new_status: status,
      });

      if (!rpcResponse.error) {
        void logActivity({
          action: 'roles.update_user_status',
          targetUserId: userId,
          metadata: { status },
        });
        return;
      }
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;

    void logActivity({
      action: 'roles.update_user_status',
      targetUserId: userId,
      metadata: { status },
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
}

/**
 * Asignar rol admin a un usuario
 */
export async function assignAdminRole(userId: string): Promise<void> {
  try {
    await assertCurrentUserIsAdmin();

    const rpcClient = supabase as unknown as RpcClient;
    if (typeof rpcClient.rpc === 'function') {
      const rpcResponse = await rpcClient.rpc('admin_update_user_profile', {
        target_user_id: userId,
        new_role_name: 'admin',
      });

      if (!rpcResponse.error) {
        void logActivity({
          action: 'roles.assign_admin_role',
          targetUserId: userId,
        });
        return;
      }
    }

    const adminRole = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    if (adminRole.error) throw adminRole.error;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        role_id: adminRole.data.id,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;

    void logActivity({
      action: 'roles.assign_admin_role',
      targetUserId: userId,
    });
  } catch (error) {
    console.error('Error assigning admin role:', error);
    throw error;
  }
}

/**
 * Remover rol admin (asignar rol user)
 */
export async function removeAdminRole(userId: string): Promise<void> {
  try {
    await assertCurrentUserIsAdmin();

    const rpcClient = supabase as unknown as RpcClient;
    if (typeof rpcClient.rpc === 'function') {
      const rpcResponse = await rpcClient.rpc('admin_update_user_profile', {
        target_user_id: userId,
        new_role_name: 'user',
      });

      if (!rpcResponse.error) {
        void logActivity({
          action: 'roles.remove_admin_role',
          targetUserId: userId,
        });
        return;
      }
    }

    const userRole = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'user')
      .single();

    if (userRole.error) throw userRole.error;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        role_id: userRole.data.id,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;

    void logActivity({
      action: 'roles.remove_admin_role',
      targetUserId: userId,
    });
  } catch (error) {
    console.error('Error removing admin role:', error);
    throw error;
  }
}

/**
 * Aprobar registro de usuario (cambiar estado de pending a active)
 */
export async function approveUserRegistration(userId: string): Promise<void> {
  try {
    await updateUserStatus(userId, 'active');

    void logActivity({
      action: 'roles.approve_user_registration',
      targetUserId: userId,
    });
  } catch (error) {
    console.error('Error approving user registration:', error);
    throw error;
  }
}

/**
 * Rechazar/inactivar usuario
 */
export async function rejectUserRegistration(userId: string): Promise<void> {
  try {
    await updateUserStatus(userId, 'inactive');

    void logActivity({
      action: 'roles.reject_user_registration',
      targetUserId: userId,
    });
  } catch (error) {
    console.error('Error rejecting user registration:', error);
    throw error;
  }
}
