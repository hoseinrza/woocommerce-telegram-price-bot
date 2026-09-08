-- +migrate Up
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    woocommerce_id BIGINT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    sku VARCHAR(255),
    price NUMERIC(20,4),
    regular_price NUMERIC(20,4),
    sale_price NUMERIC(20,4),
    stock_status VARCHAR(50),
    permalink TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_woocommerce_id ON products (woocommerce_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- +migrate Down
DROP TABLE IF EXISTS products;
