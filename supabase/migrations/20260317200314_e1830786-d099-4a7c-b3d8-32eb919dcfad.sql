ALTER TABLE ml_daily_cache ADD COLUMN unique_visits integer NOT NULL DEFAULT 0;
ALTER TABLE ml_daily_cache ADD COLUMN unique_buyers integer NOT NULL DEFAULT 0;