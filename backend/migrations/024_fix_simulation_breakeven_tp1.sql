-- Normaliza historico de simulaciones: breakeven debe ser TP1 (R=1)

UPDATE public.simulation_operations
SET
  technical_result_r = 1,
  monetary_result = invested_amount,
  updated_at = NOW()
WHERE result_type = 'breakeven'
  AND (
    technical_result_r IS DISTINCT FROM 1
    OR monetary_result IS DISTINCT FROM invested_amount
  );
