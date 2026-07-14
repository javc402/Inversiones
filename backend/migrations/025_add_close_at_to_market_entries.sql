ALTER TABLE public.market_entries
  ADD COLUMN IF NOT EXISTS close_at TIMESTAMP WITH TIME ZONE;

UPDATE public.market_entries
SET close_at = planned_at + INTERVAL '1 minute'
WHERE status::text = 'closed'
  AND (close_at IS NULL OR close_at <= planned_at);

ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_close_at_after_planned_check;

ALTER TABLE public.market_entries
  ADD CONSTRAINT market_entries_close_at_after_planned_check
  CHECK (
    status::text <> 'closed'
    OR (
      close_at IS NOT NULL
      AND close_at > planned_at
    )
  );

CREATE INDEX IF NOT EXISTS idx_market_entries_close_at ON public.market_entries(close_at DESC);
