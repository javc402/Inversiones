-- Agrega hora de operacion persistente para simulaciones

ALTER TABLE public.simulation_operations
ADD COLUMN IF NOT EXISTS operation_time TIME WITHOUT TIME ZONE NOT NULL DEFAULT '09:00:00';

CREATE INDEX IF NOT EXISTS idx_simulation_operations_time
ON public.simulation_operations(operation_time);
