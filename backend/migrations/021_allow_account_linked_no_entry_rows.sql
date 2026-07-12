ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_state_fields_check;

ALTER TABLE public.market_entries
  ADD CONSTRAINT market_entries_state_fields_check
  CHECK (
    (
      status::text = 'no_entry'
      AND direction IS NULL
      AND result_r IS NULL
      AND (
        (
          account_id IS NULL
          AND (account_name IS NULL OR btrim(account_name) = '')
          AND risk_amount IS NULL
          AND investment_percent IS NULL
        )
        OR
        (
          account_id IS NOT NULL
          AND account_name IS NOT NULL
          AND btrim(account_name) <> ''
          AND risk_amount > 0
          AND investment_percent > 0
        )
      )
    )
    OR
    (
      status::text <> 'no_entry'
      AND account_id IS NOT NULL
      AND account_name IS NOT NULL
      AND btrim(account_name) <> ''
      AND direction IN ('buy', 'sell')
      AND risk_amount > 0
      AND investment_percent > 0
    )
  );