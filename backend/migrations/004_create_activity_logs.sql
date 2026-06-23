-- Tabla de auditoria para registrar interacciones y transacciones de usuarios
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Un usuario puede ver sus propios logs
CREATE POLICY "activity_logs_select_own"
  ON public.activity_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Un admin activo puede ver todos los logs
CREATE POLICY "activity_logs_select_admin"
  ON public.activity_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT up.user_id
      FROM public.user_profiles up
      JOIN public.roles r ON r.id = up.role_id
      WHERE r.name = 'admin' AND up.status = 'active'
    )
  );

-- Un usuario autenticado puede insertar solo logs con su propio user_id
CREATE POLICY "activity_logs_insert_own"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
