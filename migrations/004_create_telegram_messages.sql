-- +migrate Up
CREATE TABLE IF NOT EXISTS telegram_messages (
    id BIGSERIAL PRIMARY KEY,
    telegram_chat_id BIGINT NOT NULL,
    telegram_message_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    last_price NUMERIC(20,4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(telegram_chat_id, telegram_message_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_messages_product_id ON telegram_messages (product_id);

-- +migrate Down
DROP TABLE IF EXISTS telegram_messages;
