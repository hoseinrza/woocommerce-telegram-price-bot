-- +migrate Up
CREATE TABLE IF NOT EXISTS bot_users (
    id BIGSERIAL PRIMARY KEY,
    telegram_chat_id BIGINT NOT NULL UNIQUE,
    telegram_user_id BIGINT,
    first_name TEXT,
    username TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_users_active ON bot_users (id) WHERE is_active = TRUE;

CREATE TRIGGER trg_bot_users_updated_at
    BEFORE UPDATE ON bot_users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +migrate Down
DROP TRIGGER IF EXISTS trg_bot_users_updated_at ON bot_users;
DROP TABLE IF EXISTS bot_users;
