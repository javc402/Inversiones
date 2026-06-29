-- Modulo: entradas de mercado
CREATE TABLE IF NOT EXISTS public.market_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  market_context TEXT NOT NULL,
  setup TEXT NOT NULL,
  session TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  entry_price NUMERIC(18, 6) NOT NULL CHECK (entry_price > 0),
  stop_loss NUMERIC(18, 6) NOT NULL CHECK (stop_loss > 0),
  take_profit NUMERIC(18, 6) NOT NULL CHECK (take_profit > 0),
  risk_amount NUMERIC(18, 2) NOT NULL CHECK (risk_amount > 0),
  investment_percent NUMERIC(8, 4) NOT NULL CHECK (investment_percent > 0),
  result_r NUMERIC(10, 4),
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('planned', 'open', 'closed', 'cancelled')),
  planned_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_entries_user_id ON public.market_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_market_entries_account_id ON public.market_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_market_entries_group_id ON public.market_entries(group_id);
CREATE INDEX IF NOT EXISTS idx_market_entries_updated_at ON public.market_entries(updated_at DESC);

ALTER TABLE public.market_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_entries_select_own"
  ON public.market_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "market_entries_insert_own"
  ON public.market_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "market_entries_update_own"
  ON public.market_entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "market_entries_delete_own"
  ON public.market_entries
  FOR DELETE
  USING (auth.uid() = user_id);
