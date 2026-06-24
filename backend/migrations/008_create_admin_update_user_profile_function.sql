-- Permite a un admin activo actualizar estado y/o rol de cualquier usuario.
-- Se usa SECURITY DEFINER para evitar bloqueos por RLS en updates administrativos.
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  target_user_id UUID,
  new_status TEXT DEFAULT NULL,
  new_role_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_is_admin BOOLEAN;
  target_role_id UUID;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.roles r ON r.id = up.role_id
    WHERE up.user_id = auth.uid()
      AND up.status = 'active'
      AND r.name = 'admin'
  )
  INTO actor_is_admin;

  IF NOT actor_is_admin THEN
    RAISE EXCEPTION 'forbidden: admin required';
  END IF;

  IF new_status IS NOT NULL
     AND new_status NOT IN ('pending', 'active', 'inactive') THEN
    RAISE EXCEPTION 'invalid status: %', new_status;
  END IF;

  IF new_role_name IS NOT NULL THEN
    SELECT id
    INTO target_role_id
    FROM public.roles
    WHERE LOWER(name) = LOWER(new_role_name)
    LIMIT 1;

    IF target_role_id IS NULL THEN
      RAISE EXCEPTION 'invalid role: %', new_role_name;
    END IF;
  END IF;

  UPDATE public.user_profiles up
  SET
    status = COALESCE(new_status, up.status),
    role_id = COALESCE(target_role_id, up.role_id),
    updated_at = NOW()
  WHERE up.user_id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user profile not found for user_id: %', target_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_profile(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(UUID, TEXT, TEXT) TO authenticated;
