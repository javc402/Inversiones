import { supabase } from '@lib/supabase';

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  // Crear perfil de usuario automáticamente
  if (data.user) {
    try {
      await createUserProfile(data.user.id, 'user');
    } catch (profileError) {
      console.error('Error creating user profile:', profileError);
      // No lanzar error, el usuario se registró pero sin perfil
      // El admin puede crear el perfil manualmente
    }
  }

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
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
