-- +migrate Up
CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGSERIAL PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL,
    telegram_chat_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(telegram_user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_product_id ON subscriptions (product_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_subscriptions_telegram_user_id ON subscriptions (telegram_user_id) WHERE is_active = TRUE;

-- +migrate Down
DROP TABLE IF EXISTS subscriptions;
