-- Drop and recreate badge_type enum with new values
ALTER TYPE badge_type RENAME TO badge_type_old;

CREATE TYPE badge_type AS ENUM (
  'official',
  'amateur',
  'semi_pro',
  'pro',
  'director',
  'gold',
  'silver',
  'bronze',
  'buffer'
);

-- Add year column for award badges
ALTER TABLE user_badges ADD COLUMN award_year integer;

-- Migrate existing data
ALTER TABLE user_badges 
  ALTER COLUMN badge_type TYPE badge_type 
  USING (
    CASE badge_type::text
      WHEN 'official' THEN 'official'::badge_type
      WHEN 'best' THEN 'gold'::badge_type
      ELSE 'official'::badge_type
    END
  );

-- Drop old enum
DROP TYPE badge_type_old;