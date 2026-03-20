-- Adds Pocket ID profile fields sourced from the OIDC `profile` scope.
-- Both columns are nullable so existing rows are unaffected until the next login.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS picture_url  TEXT;

