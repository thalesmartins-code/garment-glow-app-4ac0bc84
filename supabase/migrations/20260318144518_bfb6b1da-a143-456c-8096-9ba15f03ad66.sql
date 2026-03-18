ALTER TABLE ml_daily_cache ADD COLUMN IF NOT EXISTS units_sold integer NOT NULL DEFAULT 0;
ALTER TABLE ml_hourly_cache ADD COLUMN IF NOT EXISTS units_sold integer NOT NULL DEFAULT 0;