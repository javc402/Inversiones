-- Agregar soporte para marcar cuentas como favoritas
ALTER TABLE public.trading_accounts ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_trading_accounts_is_favorite ON public.trading_accounts(is_favorite) WHERE is_favorite = TRUE;
