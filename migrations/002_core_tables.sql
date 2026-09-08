-- 002_core_tables.sql — plain PG for SQLModel tables, proper indexes, no Redis
CREATE TABLE IF NOT EXISTS product (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    tagline VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    description_i18n JSONB,
    description2 TEXT,
    description2_i18n JSONB,
    price_cents INTEGER NOT NULL CHECK (price_cents>=0),
    image_url VARCHAR(500) NOT NULL DEFAULT '',
    image_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
    switches VARCHAR(200) NOT NULL,
    microcontroller VARCHAR(100) NOT NULL,
    trackball VARCHAR(100),
    firmware_type VARCHAR(50) NOT NULL DEFAULT 'ZMK',
    firmware_path VARCHAR(500),
    build_guide_path VARCHAR(500),
    kle_layout JSONB,
    in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_product_slug ON product(slug);
CREATE INDEX IF NOT EXISTS ix_product_featured ON product(featured);
CREATE INDEX IF NOT EXISTS ix_product_in_stock ON product(in_stock);

CREATE TABLE IF NOT EXISTS "order" (
    id SERIAL PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    notes TEXT,
    items_json JSONB NOT NULL,
    total_cents INTEGER NOT NULL CHECK (total_cents>=0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_order_created_at ON "order"(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_order_email ON "order"(email);

CREATE TABLE IF NOT EXISTS contactsubmission (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL DEFAULT '',
    email VARCHAR(320) NOT NULL DEFAULT '',
    contact VARCHAR(320),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_contact_created_at ON contactsubmission(created_at DESC);

CREATE TABLE IF NOT EXISTS editorsettings (
    id INTEGER PRIMARY KEY,
    snap_step_u DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    rotation_step_deg DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    nudge_fine_u DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    nudge_coarse_u DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    default_mirror_split BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO editorsettings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS layoutpreset (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    label VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    form_factor VARCHAR(20) NOT NULL,
    static_file VARCHAR(500),
    layout_json JSONB,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_layoutpreset_slug ON layoutpreset(slug);
CREATE INDEX IF NOT EXISTS ix_layoutpreset_enabled ON layoutpreset(enabled);

CREATE TABLE IF NOT EXISTS buildrequest (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL DEFAULT '',
    email VARCHAR(320) NOT NULL DEFAULT '',
    contact VARCHAR(320),
    phone VARCHAR(50),
    preferences TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    layout_json JSONB NOT NULL,
    plate_spec_json JSONB NOT NULL,
    plate_summary TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_buildrequest_created_at ON buildrequest(created_at DESC);

-- materialized view placeholder for expensive stats (instead of Redis)
-- CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_stats AS SELECT featured, count(*) FROM product GROUP BY featured;
