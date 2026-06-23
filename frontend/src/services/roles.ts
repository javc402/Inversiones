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

/**
 * Obtiene el rol del usuario actual
 */
export async function getCurrentUserRole(): Promise<Role | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role_id')
      .eq('user_id', user.id)
      .single();

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
    const { data, error } = await supabase
      .from('user_profiles')
      .select(
        `
        *,
        auth.users (
          email
        )
      `
      )
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
