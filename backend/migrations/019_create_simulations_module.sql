-- Modulo: simulaciones

CREATE TABLE IF NOT EXISTS public.simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_account_id UUID NULL REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  account_name TEXT NOT NULL,
  initial_balance NUMERIC(18, 2) NOT NULL CHECK (initial_balance > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  weekdays TEXT[] NOT NULL,
  max_operations_per_day INTEGER NOT NULL CHECK (max_operations_per_day > 0),
  pct_win NUMERIC(6, 3) NOT NULL CHECK (pct_win >= 0 AND pct_win <= 100),
  pct_sl NUMERIC(6, 3) NOT NULL CHECK (pct_sl >= 0 AND pct_sl <= 100),
  pct_breakeven NUMERIC(6, 3) NOT NULL CHECK (pct_breakeven >= 0 AND pct_breakeven <= 100),
  pct_no_trade NUMERIC(6, 3) NOT NULL CHECK (pct_no_trade >= 0 AND pct_no_trade <= 100),
  seed BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'saved')),
  total_opportunities INTEGER NOT NULL DEFAULT 0 CHECK (total_opportunities >= 0),
  total_executed INTEGER NOT NULL DEFAULT 0 CHECK (total_executed >= 0),
  total_win INTEGER NOT NULL DEFAULT 0 CHECK (total_win >= 0),
  total_sl INTEGER NOT NULL DEFAULT 0 CHECK (total_sl >= 0),
  total_breakeven INTEGER NOT NULL DEFAULT 0 CHECK (total_breakeven >= 0),
  total_no_trade INTEGER NOT NULL DEFAULT 0 CHECK (total_no_trade >= 0),
  net_result NUMERIC(18, 2) NOT NULL DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT simulations_date_range_check CHECK (start_date <= end_date),
  CONSTRAINT simulations_weekdays_not_empty_check CHECK (array_length(weekdays, 1) >= 1),
  CONSTRAINT simulations_weekdays_values_check CHECK (
    weekdays <@ ARRAY['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']::TEXT[]
  ),
  CONSTRAINT simulations_distribution_100_check CHECK (
    round((pct_win + pct_sl + pct_breakeven + pct_no_trade)::numeric, 3) = 100
  )
);

CREATE INDEX IF NOT EXISTS idx_simulations_user_id ON public.simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_simulations_status ON public.simulations(status);
CREATE INDEX IF NOT EXISTS idx_simulations_updated_at ON public.simulations(updated_at DESC);

ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "simulations_select_own"
  ON public.simulations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "simulations_insert_own"
  ON public.simulations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "simulations_update_own"
  ON public.simulations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "simulations_delete_own"
  ON public.simulations
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.simulation_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_date DATE NOT NULL,
  operation_index INTEGER NOT NULL CHECK (operation_index >= 1),
  side TEXT NULL CHECK (side IN ('buy', 'sell')),
  result_type TEXT NOT NULL CHECK (result_type IN ('win', 'sl', 'breakeven', 'no_trade')),
  invested_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (invested_amount >= 0),
  technical_result_r NUMERIC(10, 4) NULL,
  monetary_result NUMERIC(18, 2) NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  is_manual_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT simulation_operations_unique_by_day_idx UNIQUE (simulation_id, operation_date, operation_index),
  CONSTRAINT simulation_operations_no_trade_consistency_check CHECK (
    (
      result_type = 'no_trade'
      AND side IS NULL
      AND invested_amount = 0
      AND technical_result_r IS NULL
      AND monetary_result = 0
    )
    OR
    (
      result_type <> 'no_trade'
      AND side IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_simulation_operations_simulation_id ON public.simulation_operations(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_operations_user_id ON public.simulation_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_simulation_operations_date ON public.simulation_operations(operation_date DESC);
CREATE INDEX IF NOT EXISTS idx_simulation_operations_result_type ON public.simulation_operations(result_type);

ALTER TABLE public.simulation_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "simulation_operations_select_own"
  ON public.simulation_operations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "simulation_operations_insert_own"
  ON public.simulation_operations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "simulation_operations_update_own"
  ON public.simulation_operations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "simulation_operations_delete_own"
  ON public.simulation_operations
  FOR DELETE
  USING (auth.uid() = user_id);
