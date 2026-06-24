-- Guarda de una sola vez la configuración global del sistema.
-- SECURITY DEFINER para evitar bloqueos por RLS durante inserts/updates.
CREATE OR REPLACE FUNCTION public.save_system_config(config jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_is_admin BOOLEAN;
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

  INSERT INTO public.system_config (key, value, updated_by, updated_at)
  VALUES
    ('accountTypes', COALESCE(config -> 'accountTypes', '[]'::jsonb), auth.uid(), NOW()),
    ('platforms', COALESCE(config -> 'platforms', '[]'::jsonb), auth.uid(), NOW()),
    ('currencies', COALESCE(config -> 'currencies', '[]'::jsonb), auth.uid(), NOW())
  ON CONFLICT (key)
  DO UPDATE SET
    value = EXCLUDED.value,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.save_system_config(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_system_config(jsonb) TO authenticated;
