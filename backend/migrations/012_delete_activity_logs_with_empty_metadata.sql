-- Limpieza histórica: elimina eventos de auditoría que quedaron sin contexto útil.
-- Nota: esto no afecta los eventos nuevos, ya que ahora metadata siempre incluye campos base.

BEGIN;

DELETE FROM public.activity_logs
WHERE metadata = '{}'::jsonb;

COMMIT;