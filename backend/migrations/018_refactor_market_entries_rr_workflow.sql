    -- Modulo: entradas de mercado (RR manual + impacto noticia + protocolo + link operativo)
    ALTER TABLE public.market_entries
    ADD COLUMN IF NOT EXISTS symbol_detail TEXT NULL,
    ADD COLUMN IF NOT EXISTS news_impact TEXT NULL;

    DO $$
    BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'market_entries'
        AND column_name = 'envelope_protocol'
    ) THEN
        IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'market_entries'
            AND column_name = 'candle_protocol'
        ) THEN
        EXECUTE $sql$
            UPDATE public.market_entries
            SET candle_protocol = COALESCE(
            candle_protocol,
            CASE lower(envelope_protocol::text)
                WHEN 'ob' THEN 'ob'
                WHEN 'fvg' THEN 'fvg'
                ELSE 'no'
            END
            )
            WHERE envelope_protocol IS NOT NULL
        $sql$;

        ALTER TABLE public.market_entries
            DROP COLUMN envelope_protocol;
        ELSE
        ALTER TABLE public.market_entries
            RENAME COLUMN envelope_protocol TO candle_protocol;
        END IF;
    END IF;
    END $$;

    ALTER TABLE public.market_entries
    ADD COLUMN IF NOT EXISTS candle_protocol TEXT;

    ALTER TABLE public.market_entries
    ALTER COLUMN candle_protocol DROP DEFAULT;

    ALTER TABLE public.market_entries
    ALTER COLUMN candle_protocol TYPE TEXT
    USING (
        CASE lower(candle_protocol::text)
        WHEN 'ob' THEN 'ob'
        WHEN 'fvg' THEN 'fvg'
        ELSE 'no'
        END
    );

    DO $$
    BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'market_entries'
        AND column_name = 'operation_url'
    ) THEN
        IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'market_entries'
            AND column_name = 'operation_link'
        ) THEN
        UPDATE public.market_entries
        SET operation_link = COALESCE(operation_link, operation_url)
        WHERE operation_url IS NOT NULL;

        ALTER TABLE public.market_entries
            DROP COLUMN operation_url;
        ELSE
        ALTER TABLE public.market_entries
            RENAME COLUMN operation_url TO operation_link;
        END IF;
    END IF;
    END $$;

    ALTER TABLE public.market_entries
    ADD COLUMN IF NOT EXISTS operation_link TEXT NULL;

    DO $$
    BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'market_entries'
        AND column_name = 'risk_reward'
    ) THEN
        UPDATE public.market_entries
        SET result_r = COALESCE(result_r, risk_reward)
        WHERE risk_reward IS NOT NULL;

        ALTER TABLE public.market_entries
        DROP COLUMN risk_reward;
    END IF;
    END $$;

    ALTER TABLE public.market_entries
    ALTER COLUMN candle_protocol SET DEFAULT 'no';

    UPDATE public.market_entries
    SET candle_protocol = 'no'
    WHERE candle_protocol IS NULL;

    ALTER TABLE public.market_entries
    ALTER COLUMN candle_protocol SET NOT NULL;

    DROP INDEX IF EXISTS idx_market_entries_close_price;

    ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_context_source_news_check;
    ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_state_fields_check;
    ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_news_impact_check;
    ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_candle_protocol_check;
    ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_symbol_detail_check;
    ALTER TABLE public.market_entries DROP CONSTRAINT IF EXISTS market_entries_closed_result_r_check;

    ALTER TABLE public.market_entries
    DROP COLUMN IF EXISTS entry_price,
    DROP COLUMN IF EXISTS stop_loss,
    DROP COLUMN IF EXISTS take_profit,
    DROP COLUMN IF EXISTS close_price;

    UPDATE public.market_entries
    SET symbol_detail = NULL
    WHERE upper(symbol::text) <> 'OTRO'
    AND symbol_detail IS NOT NULL;

    UPDATE public.market_entries
    SET symbol_detail = COALESCE(NULLIF(btrim(symbol_detail), ''), 'OTRO')
    WHERE upper(symbol::text) = 'OTRO';

    ALTER TABLE public.market_entries
    ADD CONSTRAINT market_entries_context_source_news_check
        CHECK (
        (
            context_source = 'news'
            AND news_article_id IS NOT NULL
            AND news_impact IN ('high', 'medium', 'low')
        )
        OR
        (
            context_source <> 'news'
            AND news_article_id IS NULL
            AND news_impact IS NULL
        )
        ),
    ADD CONSTRAINT market_entries_candle_protocol_check
        CHECK (candle_protocol IN ('ob', 'fvg', 'no')),
    ADD CONSTRAINT market_entries_symbol_detail_check
        CHECK (
        (
            upper(symbol::text) = 'OTRO'
            AND symbol_detail IS NOT NULL
            AND btrim(symbol_detail) <> ''
        )
        OR
        (
            upper(symbol::text) <> 'OTRO'
            AND (symbol_detail IS NULL OR btrim(symbol_detail) = '')
        )
        ),
    ADD CONSTRAINT market_entries_closed_result_r_check
        CHECK (status::text <> 'closed' OR result_r IS NOT NULL),
    ADD CONSTRAINT market_entries_state_fields_check
        CHECK (
        (
            status::text = 'no_entry'
            AND account_id IS NULL
            AND (account_name IS NULL OR btrim(account_name) = '')
            AND direction IS NULL
            AND risk_amount IS NULL
            AND investment_percent IS NULL
            AND result_r IS NULL
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

    CREATE INDEX IF NOT EXISTS idx_market_entries_news_impact ON public.market_entries(news_impact);
    CREATE INDEX IF NOT EXISTS idx_market_entries_candle_protocol ON public.market_entries(candle_protocol);