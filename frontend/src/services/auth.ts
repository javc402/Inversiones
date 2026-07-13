import { supabase } from '@lib/supabase';
import { logAuditActivity, logAuditError } from './audit';

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logAuditError('auth.sign_in', 'auth', 'user', error, { email });
    throw error;
  }

  void logAuditActivity('auth.sign_in', {
    module: 'auth',
    targetType: 'user',
    email,
    hasSession: Boolean(data.session),
  })

  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    logAuditError('auth.sign_up', 'auth', 'user', error, { email });
    throw error;
  }

  // Crear perfil de usuario automáticamente
  if (data.user) {
    try {
      await createUserProfile(data.user.id, 'user');
    } catch (profileError) {
      logAuditError('auth.create_user_profile', 'auth', 'user', profileError, {
        targetId: data.user.id,
        email,
        role: 'user',
      });
      console.error('Error creating user profile:', profileError);
      // No lanzar error, el usuario se registró pero sin perfil
      // El admin puede crear el perfil manualmente
    }
  }

  void logAuditActivity('auth.sign_up', {
    module: 'auth',
    targetType: 'user',
    targetId: data.user?.id,
    email,
    hasUser: Boolean(data.user),
  })

  return data;
}

/**
 * Crear perfil de usuario con rol y estado
 */
export async function createUserProfile(userId: string, role: 'admin' | 'user' = 'user') {
  try {
    // Obtener ID del rol
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', role)
      .single();

    if (roleError) throw roleError;

    // Crear perfil
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        role_id: roleData.id,
        status: 'pending', // Por defecto pending hasta que admin apruebe
      });

    if (profileError) throw profileError;

    void logAuditActivity('auth.create_user_profile', {
      module: 'auth',
      targetType: 'user',
      targetId: userId,
      role,
      status: 'pending',
    })
  } catch (error) {
    logAuditError('auth.create_user_profile', 'auth', 'user', error, {
      targetId: userId,
      role,
    });
    console.error('Error in createUserProfile:', error);
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    logAuditError('auth.sign_out', 'auth', 'user', error);
    throw error;
  }

  void logAuditActivity('auth.sign_out', {
    module: 'auth',
    targetType: 'user',
  })
}
