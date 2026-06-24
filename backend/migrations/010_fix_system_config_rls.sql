-- Ajusta RLS para permitir upsert real sobre system_config.
-- El policy anterior solo tenía USING y puede bloquear inserts/updates con WITH CHECK.
DROP POLICY IF EXISTS "system_config_admin_write" ON public.system_config;

DROP POLICY IF EXISTS "system_config_admin_insert" ON public.system_config;
CREATE POLICY "system_config_admin_insert"
  ON public.system_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.roles r ON r.id = up.role_id
      WHERE up.user_id = auth.uid()
        AND up.status = 'active'
        AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "system_config_admin_update" ON public.system_config;
CREATE POLICY "system_config_admin_update"
  ON public.system_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.roles r ON r.id = up.role_id
      WHERE up.user_id = auth.uid()
        AND up.status = 'active'
        AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.roles r ON r.id = up.role_id
      WHERE up.user_id = auth.uid()
        AND up.status = 'active'
        AND r.name = 'admin'
    )
  );
