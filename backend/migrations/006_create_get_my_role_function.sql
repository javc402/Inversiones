-- Devuelve el nombre de rol del usuario autenticado usando auth.uid()
-- SECURITY DEFINER para evitar bloqueos por RLS en lecturas internas.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TABLE (role_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name AS role_name
  FROM public.user_profiles up
  JOIN public.roles r ON r.id = up.role_id
  WHERE up.user_id = auth.uid()
    AND up.status = 'active'
  ORDER BY up.updated_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
