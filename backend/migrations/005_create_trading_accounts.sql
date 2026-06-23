-- Modulo: gestion de cuentas de trading
CREATE TABLE IF NOT EXISTS public.trading_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  alias TEXT,
  broker_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('real', 'demo', 'funded')),
  platform TEXT NOT NULL CHECK (platform IN ('mt4', 'mt5', 'ctrader', 'other')),
  base_currency TEXT NOT NULL DEFAULT 'USD',
  leverage TEXT,
  initial_balance NUMERIC(14, 2) NOT NULL CHECK (initial_balance >= 0),
  initial_equity NUMERIC(14, 2),
  opened_at DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  risk_per_trade_pct NUMERIC(6, 2),
  max_daily_risk_pct NUMERIC(6, 2),
  max_drawdown_pct NUMERIC(6, 2),
  funding_firm TEXT,
  challenge_phase TEXT,
  profit_target_pct NUMERIC(6, 2),
  daily_loss_limit_pct NUMERIC(6, 2),
  max_loss_limit_pct NUMERIC(6, 2),
  payout_cycle TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON public.trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_type ON public.trading_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_status ON public.trading_accounts(status);

ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

-- Usuario: solo gestiona sus propias cuentas
CREATE POLICY "trading_accounts_select_own"
  ON public.trading_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "trading_accounts_insert_own"
  ON public.trading_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trading_accounts_update_own"
  ON public.trading_accounts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trading_accounts_delete_own"
  ON public.trading_accounts
  FOR DELETE
  USING (auth.uid() = user_id);
