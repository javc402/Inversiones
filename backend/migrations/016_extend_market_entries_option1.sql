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

ALTER TABLE public.market_entries
  ADD CONSTRAINT market_entries_status_check
    CHECK (status IN ('planned', 'open', 'closed', 'cancelled', 'no_entry')),
  ADD CONSTRAINT market_entries_context_source_check
    CHECK (context_source IN ('free_text', 'news')),
  ADD CONSTRAINT market_entries_context_source_news_check
    CHECK (
      (context_source = 'news' AND news_article_id IS NOT NULL)
      OR (context_source = 'free_text' AND news_article_id IS NULL)
    ),
  ADD CONSTRAINT market_entries_no_entry_reason_check
    CHECK (
      status <> 'no_entry'
      OR (no_entry_reason IS NOT NULL AND btrim(no_entry_reason) <> '')
    ),
  ADD CONSTRAINT market_entries_state_fields_check
    CHECK (
      (
        status = 'no_entry'
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
        status <> 'no_entry'
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
