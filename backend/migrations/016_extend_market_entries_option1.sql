-- Modulo: entradas de mercado (opcion 1 contexto/noticia + sin entrada)
ALTER TABLE public.market_entries
  ADD COLUMN IF NOT EXISTS context_source TEXT NOT NULL DEFAULT 'free_text',
  ADD COLUMN IF NOT EXISTS news_article_id UUID NULL,
  ADD COLUMN IF NOT EXISTS no_entry_reason TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'market_entries_news_article_id_fkey'
  ) THEN
    ALTER TABLE public.market_entries
      ADD CONSTRAINT market_entries_news_article_id_fkey
      FOREIGN KEY (news_article_id)
      REFERENCES public.news_articles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.market_entries
  ALTER COLUMN account_id DROP NOT NULL,
  ALTER COLUMN account_name DROP NOT NULL,
  ALTER COLUMN direction DROP NOT NULL,
  ALTER COLUMN entry_price DROP NOT NULL,
  ALTER COLUMN stop_loss DROP NOT NULL,
  ALTER COLUMN take_profit DROP NOT NULL,
  ALTER COLUMN risk_amount DROP NOT NULL,
  ALTER COLUMN investment_percent DROP NOT NULL;

ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_direction_check;
ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_entry_price_check;
ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_stop_loss_check;
ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_take_profit_check;
ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_risk_amount_check;
ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_investment_percent_check;
ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_status_check;
ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_context_source_check;
ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_context_source_news_check;
ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_no_entry_reason_check;
ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_state_fields_check;

CREATE OR REPLACE FUNCTION public.market_entries_is_valid_status(status_value TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT status_value IN ('planned', 'open', 'closed', 'cancelled', 'no_entry');
$$;

CREATE OR REPLACE FUNCTION public.market_entries_is_no_entry(status_value TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT status_value = 'no_entry';
$$;

CREATE OR REPLACE FUNCTION public.market_entries_is_valid_context_source(context_value TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT context_value IN ('free_text', 'news');
$$;

CREATE OR REPLACE FUNCTION public.market_entries_is_news_context(context_value TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT context_value = 'news';
$$;

ALTER TABLE public.market_entries
  ADD CONSTRAINT market_entries_status_check
    CHECK (public.market_entries_is_valid_status(status)),
  ADD CONSTRAINT market_entries_context_source_check
    CHECK (public.market_entries_is_valid_context_source(context_source)),
  ADD CONSTRAINT market_entries_context_source_news_check
    CHECK (
      (public.market_entries_is_news_context(context_source) AND news_article_id IS NOT NULL)
      OR (NOT public.market_entries_is_news_context(context_source) AND news_article_id IS NULL)
    ),
  ADD CONSTRAINT market_entries_no_entry_reason_check
    CHECK (
      NOT public.market_entries_is_no_entry(status)
      OR (no_entry_reason IS NOT NULL AND btrim(no_entry_reason) <> '')
    ),
  ADD CONSTRAINT market_entries_state_fields_check
    CHECK (
      (
        public.market_entries_is_no_entry(status)
        AND account_id IS NULL
        AND (account_name IS NULL OR btrim(account_name) = '')
        AND direction IS NULL
        AND entry_price IS NULL
        AND stop_loss IS NULL
        AND take_profit IS NULL
        AND risk_amount IS NULL
        AND investment_percent IS NULL
      )
      OR
      (
        NOT public.market_entries_is_no_entry(status)
        AND account_id IS NOT NULL
        AND account_name IS NOT NULL
        AND btrim(account_name) <> ''
        AND direction IN ('buy', 'sell')
        AND entry_price > 0
        AND stop_loss > 0
        AND take_profit > 0
        AND risk_amount > 0
        AND investment_percent > 0
      )
    );

CREATE INDEX IF NOT EXISTS idx_market_entries_context_source ON public.market_entries(context_source);
CREATE INDEX IF NOT EXISTS idx_market_entries_news_article_id ON public.market_entries(news_article_id);
CREATE INDEX IF NOT EXISTS idx_market_entries_status ON public.market_entries(status);
