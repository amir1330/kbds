-- Migration: Create keyboard table for custom/ergonomic listings
-- Spec: Product / Keyboard entity with AGPL requirements

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE keyboard_status AS ENUM ('IN_STOCK', 'MADE_TO_ORDER', 'PREORDER', 'OUT_OF_STOCK');
CREATE TYPE connectivity AS ENUM ('BLUETOOTH', 'WIRED', 'RECEIVER_2_4GHZ');

CREATE TABLE IF NOT EXISTS keyboard (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    tagline VARCHAR(300) NOT NULL,
    short_description VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    status keyboard_status NOT NULL DEFAULT 'MADE_TO_ORDER',
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    images JSON NOT NULL DEFAULT '[]'::json,
    github_url VARCHAR(500),
    firmware VARCHAR(100),
    microcontroller VARCHAR(100),
    connectivity JSON NOT NULL DEFAULT '[]'::json,
    layout_type VARCHAR(100),
    switches VARCHAR(200),
    keycaps VARCHAR(200),
    case_material VARCHAR(200),
    hotswap BOOLEAN NOT NULL DEFAULT TRUE,
    trackball BOOLEAN NOT NULL DEFAULT FALSE,
    battery VARCHAR(100),
    weight_grams INTEGER CHECK (weight_grams >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_keyboard_slug ON keyboard (slug);
CREATE INDEX IF NOT EXISTS ix_keyboard_status ON keyboard (status);
CREATE INDEX IF NOT EXISTS ix_keyboard_featured ON keyboard (featured);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_keyboard_updated_at ON keyboard;
CREATE TRIGGER update_keyboard_updated_at BEFORE UPDATE ON keyboard
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SQLite fallback (for local dev): same table without ENUM types
-- CREATE TABLE IF NOT EXISTS keyboard (
--     id VARCHAR PRIMARY KEY,
--     name VARCHAR NOT NULL,
--     slug VARCHAR NOT NULL UNIQUE,
--     tagline VARCHAR NOT NULL,
--     short_description VARCHAR NOT NULL,
--     description TEXT NOT NULL,
--     price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
--     status VARCHAR NOT NULL DEFAULT 'MADE_TO_ORDER' CHECK (status IN ('IN_STOCK','MADE_TO_ORDER','PREORDER','OUT_OF_STOCK')),
--     featured BOOLEAN NOT NULL DEFAULT 0,
--     images JSON NOT NULL DEFAULT '[]',
--     github_url VARCHAR,
--     firmware VARCHAR,
--     microcontroller VARCHAR,
--     connectivity JSON NOT NULL DEFAULT '[]',
--     layout_type VARCHAR,
--     switches VARCHAR,
--     keycaps VARCHAR,
--     case_material VARCHAR,
--     hotswap BOOLEAN NOT NULL DEFAULT 1,
--     trackball BOOLEAN NOT NULL DEFAULT 0,
--     battery VARCHAR,
--     weight_grams INTEGER CHECK (weight_grams >= 0),
--     created_at TIMESTAMP NOT NULL,
--     updated_at TIMESTAMP NOT NULL
-- );
