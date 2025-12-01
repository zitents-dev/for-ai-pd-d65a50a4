# Database Migrations Documentation

This document provides an organized overview of all database migrations in the `supabase/migrations/` directory.

## Migration Execution Order

Migrations are executed in chronological order based on their timestamp prefix. Below is the complete migration history with descriptions:

### 1. Initial Schema Setup
**File**: `20251116225600_6ea1f5ca-aea2-455e-8a4f-136ca3788cfb.sql`  
**Date**: November 16, 2025

**Changes**:
- Creates `profiles` table for user information
- Creates `videos` table for video content
- Sets up Row Level Security (RLS) policies
- Creates storage buckets: `videos`, `thumbnails`, `avatars`
- Implements storage access policies
- Adds `handle_new_user()` function to auto-create profiles on signup
- Creates search indexes for videos and profiles

---

### 2. Add Favorites Feature
**File**: `20251123081151_507b02cb-17f1-400d-8cb9-c9e3e098a969.sql`  
**Date**: November 23, 2025

**Changes**:
- Creates `favorites` table with unique constraint per user-video pair
- Sets up RLS policies (users can only view/manage their own favorites)
- Adds performance indexes on `user_id` and `video_id`

---

### 3. Add Likes System
**File**: `20251125111417_bd9b0f23-91c5-435b-ab0a-5c41f2aee8b7.sql`  
**Date**: November 25, 2025

**Changes**:
- Creates `likes` table with unique constraint per video-user pair
- Adds `likes_count` column to `videos` table
- Implements `update_likes_count()` function to automatically update count
- Creates trigger to maintain accurate like counts
- Sets up RLS policies (public viewing, users manage own likes)

---

### 4. Fix Likes Function Security
**File**: `20251125111525_63aecb20-0c03-4e04-811e-694311901bf8.sql`  
**Date**: November 25, 2025

**Changes**:
- Updates `update_likes_count()` function with proper security settings
- Adds `SECURITY DEFINER` and `SET search_path = public`

---

### 5. Add Playlists Feature
**File**: `20251130105237_2cb8eb17-19d3-49be-9829-f24a06d82eaf.sql`  
**Date**: November 30, 2025

**Changes**:
- Creates `playlists` table with public/private toggle
- Creates `playlist_videos` junction table with position tracking
- Implements complex RLS policies (public playlists viewable by all, private only by owner)
- Adds `update_playlist_updated_at()` function and trigger
- Creates performance indexes for playlist queries

---

### 6. Fix Playlist Function Security
**File**: `20251130105307_0debe1f4-10c0-4f5c-a657-f733f04f795c.sql`  
**Date**: November 30, 2025

**Changes**:
- Updates `update_playlist_updated_at()` function with proper security settings
- Adds `SECURITY DEFINER` and `SET search_path = public`

---

### 7. Add Watch History
**File**: `20251130105900_5cf438e0-014f-4900-8d26-fdffaa98e654.sql`  
**Date**: November 30, 2025

**Changes**:
- Creates `watch_history` table with unique constraint per user-video pair
- Sets up RLS policies (users can only access their own history)
- Implements `update_watch_history_timestamp()` function to update timestamp on re-watch
- Creates performance indexes on `user_id` and composite `(user_id, watched_at DESC)`

---

### 8. Add Performance Indexes
**File**: `20251130111201_90392ba9-2b0c-42f5-8572-4bab69a44343.sql`  
**Date**: November 30, 2025

**Changes**:
- Adds indexes for common video queries:
  - `idx_videos_created_at_desc` - For chronological listing
  - `idx_videos_views_desc` - For trending/popular videos
  - `idx_videos_category_created_at` - For category filtering
- Adds `idx_watch_history_user_watched` for user history queries
- Adds `idx_likes_video_type` for like aggregation
- Adds `idx_playlists_public_created` for public playlist discovery
- Adds `idx_comments_video_created` for comment retrieval
- Adds `idx_favorites_user_created` for user favorites

---

### 9. Add Video Content Restrictions
**File**: `20251130115933_0fa7ae96-4e6f-41d0-a687-9e7edf463d78.sql`  
**Date**: November 30, 2025

**Changes**:
- Adds `age_restriction` array column to videos (child, under_19, adult)
- Adds `has_sexual_content` boolean flag
- Adds `has_violence_drugs` boolean flag
- Includes documentation comments for content filtering

---

### 10. Add User Content Preferences
**File**: `20251130120600_18605d3b-b993-4819-b303-98360521ab84.sql`  
**Date**: November 30, 2025

**Changes**:
- Adds content filtering preferences to profiles table:
  - `hide_child_content`
  - `hide_under19_content`
  - `hide_adult_content`
  - `hide_sexual_content`
  - `hide_violence_drugs_content`

---

### 11. Add Profile Metadata Fields
**File**: `20251130121557_3413efd4-ada1-4fb9-abde-d2b866049ecc.sql`  
**Date**: November 30, 2025

**Changes**:
- Adds `name_updated_at` timestamp to track name changes
- Adds `show_email` boolean for email visibility control
- Backfills `name_updated_at` with existing `created_at` values

---

### 12. Add Profile Email Display
**File**: `20251130121726_aac11811-e2d3-4616-98c4-5e8a180d1a6e.sql`  
**Date**: November 30, 2025

**Changes**:
- Adds `email` text column to profiles for optional public display

---

### 13. Add Profile Banner Support
**File**: `20251130121850_8cef40df-b5e2-4e31-8fa9-8b0a469bb4de.sql`  
**Date**: November 30, 2025

**Changes**:
- Adds `banner_url` text column to profiles for banner image customization

---

### 14. Add Video Category and AI Solution Fields
**File**: `20251201XXXXXX_add_video_category_and_ai_fields.sql`  
**Date**: December 1, 2025

**Changes**:
- Creates `video_category` enum type (education, entertainment, gaming, music, sports, technology, lifestyle, other)
- Creates `ai_solution` enum type (chatgpt, claude, midjourney, stable_diffusion, runway, elevenlabs, other)
- Adds `category` column to videos table
- Adds `ai_solution` column to videos table
- Adds `show_prompt` boolean column to videos table
- Adds `prompt_command` text column to videos table
- All columns added with `IF NOT EXISTS` to prevent conflicts with existing schema

---

### 15. Add Database Views for Query Performance
**File**: `20251201XXXXXX_create_database_views.sql`  
**Date**: December 1, 2025

**Changes**:
- Creates `video_details_view` - Combines videos with creator info and engagement metrics
- Creates `user_playlists_view` - Shows playlists with video counts and creator information
- Creates `comment_details_view` - Comments joined with user profile information
- Creates `watch_history_details_view` - Watch history with complete video and creator details
- Creates `trending_videos_view` - Videos with engagement score for trending/popular content
- Creates `user_statistics_view` - User profile statistics including videos, views, playlists, and activity
- All views created with `SECURITY INVOKER` to respect RLS policies of querying users
- Grants SELECT permissions on all views to authenticated users

---

## Complete Schema Reference

For a complete, consolidated view of the current database schema, see **[docs/SCHEMA.sql](./docs/SCHEMA.sql)**.

This reference file includes:
- All table definitions with columns and constraints
- All enum types
- All database views with their definitions
- All indexes for performance optimization
- All functions and triggers
- Complete RLS policy definitions
- Storage bucket configuration

**Note**: The SCHEMA.sql file is for reference only. The actual database schema is managed through the migration files in `supabase/migrations/`.

## Current Database Schema

### Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `profiles` | User profiles | Auto-created on signup, public viewing |
| `videos` | Video content | RLS protected, public viewing, creator-only editing |
| `comments` | Video comments | Public viewing, users delete own |
| `likes` | Video likes/dislikes | Public viewing, auto-updates video count |
| `favorites` | User favorites | Private, user-specific |
| `playlists` | Custom playlists | Public/private toggle, user-owned |
| `playlist_videos` | Playlist contents | Junction table with position ordering |
| `watch_history` | View tracking | Private, auto-updates timestamp |

### Views

| View | Purpose | Benefits |
|------|---------|----------|
| `video_details_view` | Videos with creator info and engagement | Single query for video cards with likes, dislikes, comments |
| `user_playlists_view` | Playlists with video counts | Optimized playlist listings with metadata |
| `comment_details_view` | Comments with user profiles | Pre-joined comment display data |
| `watch_history_details_view` | History with full video details | Complete watch history in one query |
| `trending_videos_view` | Videos with engagement scores | Pre-calculated trending algorithm results |
| `user_statistics_view` | User activity summaries | Aggregated user metrics for profiles |

**Note**: All views use `SECURITY INVOKER` to respect RLS policies of the querying user.

### Functions

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Auto-creates profile on user signup |
| `update_likes_count()` | Maintains accurate like counts on videos |
| `update_playlist_updated_at()` | Updates playlist timestamp on changes |
| `update_watch_history_timestamp()` | Updates watch timestamp on re-watch |

### Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `videos` | Yes | User-uploaded video files |
| `thumbnails` | Yes | Video thumbnail images |
| `avatars` | Yes | User profile pictures |

## Security Notes

- **All tables have RLS enabled** - No table can be accessed without proper policies
- **Security Definer Functions** - All triggers use `SECURITY DEFINER` with `search_path = public` to prevent SQL injection
- **User Isolation** - Users can only modify their own content (videos, comments, playlists, etc.)
- **Public vs Private** - Content is either fully public or fully private to the owner
- **Storage Policies** - Files are stored in user-specific folders using auth.uid()

## Migration Best Practices

When creating new migrations:
1. **Use descriptive comments** at the top of each migration file
2. **Include rollback strategy** in comments if applicable
3. **Add SECURITY DEFINER** and search_path to all functions
4. **Enable RLS** on all new tables
5. **Create appropriate indexes** for query performance
6. **Test policies** to ensure proper access control
7. **Use IF NOT EXISTS** when safe to allow migration reruns
