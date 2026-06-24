-- Almacena configuración global del sistema (tipos de cuenta, plataformas, monedas).
-- Todos los usuarios autenticados pueden leer; solo admins activos pueden escribir.
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '[]',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado
CREATE POLICY "system_config_select"
  ON public.system_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Escritura: solo admins activos
CREATE POLICY "system_config_admin_write"
  ON public.system_config
  FOR ALL
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
  );

-- Valores por defecto
INSERT INTO public.system_config (key, value) VALUES
  ('accountTypes', '[{"id":"real","label":"Real","value":"real","description":"Cuenta de dinero real en broker"},{"id":"demo","label":"Demo","value":"demo","description":"Cuenta de práctica sin riesgo"},{"id":"funded","label":"Fondeo","value":"funded","description":"Cuenta financiada por firma externa"}]'),
  ('platforms', '[{"id":"mt4","label":"MT4","value":"mt4"},{"id":"mt5","label":"MT5","value":"mt5"},{"id":"ctrader","label":"cTrader","value":"ctrader"},{"id":"other","label":"Otro","value":"other"}]'),
  ('currencies', '[{"id":"USD","label":"USD – Dólar estadounidense","value":"USD"},{"id":"EUR","label":"EUR – Euro","value":"EUR"},{"id":"GBP","label":"GBP – Libra esterlina","value":"GBP"}]')
ON CONFLICT (key) DO NOTHING;
