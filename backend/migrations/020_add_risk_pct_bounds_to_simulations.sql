-- Agrega el rango de riesgo porcentual por operacion a las simulaciones

ALTER TABLE public.simulations
  ADD COLUMN IF NOT EXISTS risk_pct_min NUMERIC(6, 3) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS risk_pct_max NUMERIC(6, 3) NOT NULL DEFAULT 1;

ALTER TABLE public.simulations
  DROP CONSTRAINT IF EXISTS simulations_risk_pct_bounds_check;

ALTER TABLE public.simulations
  ADD CONSTRAINT simulations_risk_pct_bounds_check CHECK (
    risk_pct_min >= 0
    AND risk_pct_min <= 100
    AND risk_pct_max >= 0
    AND risk_pct_max <= 100
    AND risk_pct_min <= risk_pct_max
  );