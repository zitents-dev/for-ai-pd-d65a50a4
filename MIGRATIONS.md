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

### 5. Core Schema Rebuild
**File**: `20251130073638_bd2006a5-8cba-4bbc-bfd3-b570af908ff8.sql`  
**Date**: November 30, 2025

**Changes**:
- Comprehensive rebuild of core tables: `profiles`, `videos`, `likes`, `favorites`, `comments`
- Consolidates and updates all RLS policies
- Recreates storage buckets and access policies
- Reimplements `handle_new_user()` function and trigger
- Ensures consistent foreign key relationships

---

### 6. Add Playlists Feature
**File**: `20251130105237_2cb8eb17-19d3-49be-9829-f24a06d82eaf.sql`  
**Date**: November 30, 2025

**Changes**:
- Creates `playlists` table with public/private toggle
- Creates `playlist_videos` junction table with position tracking
- Implements complex RLS policies (public playlists viewable by all, private only by owner)
- Adds `update_playlist_updated_at()` function and trigger
- Creates performance indexes for playlist queries

---

### 7. Fix Playlist Function Security
**File**: `20251130105307_0debe1f4-10c0-4f5c-a657-f733f04f795c.sql`  
**Date**: November 30, 2025

**Changes**:
- Updates `update_playlist_updated_at()` function with proper security settings
- Adds `SECURITY DEFINER` and `SET search_path = public`

---

### 8. Add Watch History
**File**: `20251130105900_5cf438e0-014f-4900-8d26-fdffaa98e654.sql`  
**Date**: November 30, 2025

**Changes**:
- Creates `watch_history` table with unique constraint per user-video pair
- Sets up RLS policies (users can only access their own history)
- Implements `update_watch_history_timestamp()` function to update timestamp on re-watch
- Creates performance indexes on `user_id` and composite `(user_id, watched_at DESC)`

---

### 9. Add Performance Indexes
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
