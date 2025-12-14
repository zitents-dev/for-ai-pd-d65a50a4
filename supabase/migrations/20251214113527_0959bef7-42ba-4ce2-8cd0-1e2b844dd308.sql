-- Add 'mentor' to badge_type enum
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'mentor' AFTER 'director';