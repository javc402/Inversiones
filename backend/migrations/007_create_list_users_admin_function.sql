-- Devuelve listado de usuarios para panel admin con email, rol y estado.
-- Evita joins embebidos no soportados desde PostgREST hacia auth.users.
CREATE OR REPLACE FUNCTION public.list_users_admin()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  role_id UUID,
  role_name TEXT,
  email TEXT,
  status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    up.id,
    up.user_id,
    up.role_id,
    r.name AS role_name,
    au.email,
    up.status,
    up.created_at,
    up.updated_at
  FROM public.user_profiles up
  JOIN public.roles r ON r.id = up.role_id
  JOIN auth.users au ON au.id = up.user_id
  WHERE EXISTS (
    SELECT 1
    FROM public.user_profiles my_up
    JOIN public.roles my_r ON my_r.id = my_up.role_id
    WHERE my_up.user_id = auth.uid()
      AND my_up.status = 'active'
      AND my_r.name = 'admin'
  )
  ORDER BY up.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_users_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_users_admin() TO authenticated;
