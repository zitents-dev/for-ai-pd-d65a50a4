# Database Migrations Guide

## Overview
This document explains the migration history and provides guidance for future migrations.

## Migration History

### Initial Setup (20251116225600)
- Created `profiles`, `videos`, `likes`, `favorites`, `comments` tables
- Set up storage buckets (videos, thumbnails, avatars)
- Created RLS policies for all tables
- Added triggers for `handle_new_user()` and `update_updated_at_column()`
- Created indexes for search optimization

### Favorites Table (20251123081151)
- Added `favorites` table for user's saved videos
- Created RLS policies for private favorites
- Added performance indexes

### Likes System (20251125111417-111525)
- Enhanced `likes` table with like/dislike support
- Added `likes_count` column to videos
- Created trigger to auto-update likes count
- Fixed search_path security issue

### Database Reorganization (20251130073638)
⚠️ **Note:** This migration appears to be a duplicate/reorganization. In production, avoid creating duplicate table definitions.

### Playlists Feature (20251130105237-105307)
- Added `playlists` and `playlist_videos` tables
- Created RLS policies for public/private playlists
- Added indexes for performance
- Created `update_playlist_updated_at()` function

### Watch History (20251130105900)
- Added `watch_history` table
- Created RLS policies for privacy
- Added indexes for efficient queries
- Created timestamp update trigger

### Performance Indexes (20251130111201)
- Added composite indexes for common queries
- Optimized sorting and filtering operations

### Content Filters (20251130115933, 20251130120600)
- Added age restriction fields to videos
- Added content filter preferences to profiles

### Profile Enhancements (20251130121557, 20251130121726, 20251130121850)
- Added `name_updated_at` for name change cooldown
- Added `show_email` and `email` for email visibility
- Added `banner_url` for profile banners

---

## Best Practices for Future Migrations

### 1. Check Before Creating
Always verify table/column doesn't exist:
```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'your_table'
);
```

### 2. Use IF NOT EXISTS
```sql
CREATE TABLE IF NOT EXISTS public.your_table (...);
ALTER TABLE public.your_table ADD COLUMN IF NOT EXISTS your_column TEXT;
CREATE INDEX IF NOT EXISTS idx_name ON public.your_table(column);
```

### 3. Always Set search_path
```sql
CREATE OR REPLACE FUNCTION public.your_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;
```

### 4. Add Indexes with Foreign Keys
```sql
ALTER TABLE child ADD COLUMN parent_id UUID REFERENCES parent(id);
CREATE INDEX idx_child_parent_id ON child(parent_id);
```

### 5. Test RLS Policies
```sql
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-uuid';
SELECT * FROM your_table;
RESET ROLE;
```
