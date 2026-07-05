-- Modulo: entradas de mercado (valor de cierre real por cuenta)
ALTER TABLE public.market_entries
  ADD COLUMN IF NOT EXISTS close_price NUMERIC(18, 6) NULL;

CREATE INDEX IF NOT EXISTS idx_market_entries_close_price ON public.market_entries(close_price);
