-- +migrate Up
CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    old_price NUMERIC(20,4),
    new_price NUMERIC(20,4) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history (product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON price_history (product_id, changed_at DESC);

-- +migrate Down
DROP TABLE IF EXISTS price_history;
