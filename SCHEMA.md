# Database Schema Documentation

## Overview
This document describes the complete database schema for the AI Video Platform.

## Tables

### profiles
User profile information extending auth.users.

**Columns:**
- `id` (uuid, PK): References auth.users(id)
- `name` (text): User display name
- `bio` (text): User biography
- `avatar_url` (text): Profile picture URL
- `banner_url` (text): Profile banner image URL
- `email` (text): User email (for public display when show_email is true)
- `name_updated_at` (timestamp): Last time name was changed (14-day cooldown)
- `show_email` (boolean): Whether to display email on public profile
- `hide_child_content` (boolean): Filter preference for child-inappropriate content
- `hide_under19_content` (boolean): Filter preference for under-19 content
- `hide_adult_content` (boolean): Filter preference for adult content
- `hide_sexual_content` (boolean): Filter preference for sexual content
- `hide_violence_drugs_content` (boolean): Filter preference for violence/drug content
- `created_at` (timestamp): Profile creation timestamp

**Indexes:**
- Primary key on `id`
- GIN index on `name` for full-text search

**RLS Policies:**
- SELECT: Public (anyone can view)
- INSERT: Users can create their own profile
- UPDATE: Users can update their own profile

---

### videos
Video content uploaded by creators.

**Columns:**
- `id` (uuid, PK): Unique video identifier
- `creator_id` (uuid, FK): References profiles(id)
- `title` (text): Video title
- `description` (text): Video description
- `video_url` (text): Storage URL for video file
- `thumbnail_url` (text): Storage URL for thumbnail
- `duration` (integer): Video duration in seconds
- `tags` (text[]): Array of tags
- `views` (integer): View count
- `likes_count` (integer): Like count (auto-updated via trigger)
- `category` (enum): Video category
- `ai_solution` (enum): AI tool used to create video
- `prompt_command` (text): AI prompt used
- `show_prompt` (boolean): Whether to display prompt publicly
- `age_restriction` (text[]): Age restrictions (child, under_19, adult)
- `has_sexual_content` (boolean): Contains sexual content
- `has_violence_drugs` (boolean): Contains violence/drug content
- `created_at` (timestamp): Upload timestamp

**Indexes:**
- Primary key on `id`
- Index on `creator_id`
- GIN index on `title` for full-text search
- GIN index on `tags`
- Index on `created_at DESC` for sorting
- Index on `views DESC` for sorting
- Composite index on `(category, created_at DESC)` for filtered sorting

**RLS Policies:**
- SELECT: Public (anyone can view)
- INSERT: Users can create videos with their own creator_id
- UPDATE: Users can update their own videos
- DELETE: Users can delete their own videos

---

### likes
Video like/dislike interactions.

**Columns:**
- `id` (uuid, PK): Unique like identifier
- `user_id` (uuid, FK): References profiles(id)
- `video_id` (uuid, FK): References videos(id)
- `type` (text): 'like' or 'dislike'
- `created_at` (timestamp): Like timestamp

**Constraints:**
- UNIQUE(user_id, video_id): One like/dislike per user per video

**Indexes:**
- Primary key on `id`
- Composite index on `(video_id, type)` for aggregation

**RLS Policies:**
- SELECT: Public (anyone can view likes)
- INSERT/DELETE: Users can manage their own likes

**Triggers:**
- Updates `videos.likes_count` on INSERT/DELETE

---

### favorites
User's saved/favorited videos.

**Columns:**
- `id` (uuid, PK): Unique favorite identifier
- `user_id` (uuid, FK): References profiles(id)
- `video_id` (uuid, FK): References videos(id)
- `created_at` (timestamp): Favorite timestamp

**Constraints:**
- UNIQUE(user_id, video_id): One favorite per user per video

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Index on `video_id`
- Composite index on `(user_id, created_at DESC)`

**RLS Policies:**
- SELECT: Users can only view their own favorites
- INSERT/DELETE: Users can manage their own favorites

---

### comments
Video comments.

**Columns:**
- `id` (uuid, PK): Unique comment identifier
- `video_id` (uuid, FK): References videos(id)
- `user_id` (uuid, FK): References profiles(id)
- `content` (text): Comment text
- `created_at` (timestamp): Comment timestamp

**Indexes:**
- Primary key on `id`
- Composite index on `(video_id, created_at DESC)`

**RLS Policies:**
- SELECT: Public (anyone can view comments)
- INSERT: Users can create comments
- DELETE: Users can delete their own comments

---

### playlists
User-created video playlists.

**Columns:**
- `id` (uuid, PK): Unique playlist identifier
- `user_id` (uuid, FK): References profiles(id)
- `title` (text): Playlist title
- `description` (text): Playlist description
- `is_public` (boolean): Whether playlist is publicly visible
- `thumbnail_url` (text): Playlist thumbnail
- `created_at` (timestamp): Creation timestamp
- `updated_at` (timestamp): Last update timestamp

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Index on `is_public`
- Partial index on `(is_public, created_at DESC)` for public playlists

**RLS Policies:**
- SELECT: Public playlists or user's own playlists
- INSERT: Users can create their own playlists
- UPDATE: Users can update their own playlists
- DELETE: Users can delete their own playlists

**Triggers:**
- Updates `updated_at` on UPDATE

---

### playlist_videos
Junction table for playlist-video relationships.

**Columns:**
- `id` (uuid, PK): Unique record identifier
- `playlist_id` (uuid, FK): References playlists(id)
- `video_id` (uuid, FK): References videos(id)
- `position` (integer): Order position in playlist
- `added_at` (timestamp): When video was added

**Constraints:**
- UNIQUE(playlist_id, video_id): One video per playlist

**Indexes:**
- Primary key on `id`
- Index on `playlist_id`
- Composite index on `(playlist_id, position)`

**RLS Policies:**
- SELECT: Viewable if playlist is viewable
- INSERT/UPDATE/DELETE: Users can manage their own playlist videos

---

### watch_history
User video watch history.

**Columns:**
- `id` (uuid, PK): Unique record identifier
- `user_id` (uuid, FK): References profiles(id)
- `video_id` (uuid, FK): References videos(id)
- `watched_at` (timestamp): Last watch timestamp

**Constraints:**
- UNIQUE(user_id, video_id): One record per user per video

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Composite index on `(user_id, watched_at DESC)`

**RLS Policies:**
- All operations: Users can only manage their own watch history

**Triggers:**
- Updates `watched_at` on UPDATE (when rewatching)

---

### user_badges
User achievement badges.

**Columns:**
- `id` (uuid, PK): Unique badge identifier
- `user_id` (uuid, FK): References profiles(id)
- `badge_type` (enum): 'best' or 'official'
- `awarded_at` (timestamp): When badge was awarded
- `awarded_by` (uuid, FK): Admin who awarded (references profiles)

**RLS Policies:**
- SELECT: Public (anyone can view badges)
- INSERT/UPDATE/DELETE: Admin only (not implemented via RLS, requires application logic)

---

### directories
User-created video collections (similar to folders).

**Columns:**
- `id` (uuid, PK): Unique directory identifier
- `user_id` (uuid, FK): References profiles(id)
- `name` (text): Directory name
- `description` (text): Directory description
- `created_at` (timestamp): Creation timestamp

**RLS Policies:**
- All operations: Users can only manage their own directories

---

### directory_videos
Junction table for directory-video relationships.

**Columns:**
- `id` (uuid, PK): Unique record identifier
- `directory_id` (uuid, FK): References directories(id)
- `video_id` (uuid, FK): References videos(id)
- `added_at` (timestamp): When video was added

**RLS Policies:**
- All operations: Users can manage videos in their own directories

---

### reports
User-submitted video reports.

**Columns:**
- `id` (uuid, PK): Unique report identifier
- `video_id` (uuid, FK): References videos(id)
- `reporter_id` (uuid, FK): References profiles(id)
- `reason` (text): Report reason
- `details` (text): Additional details
- `created_at` (timestamp): Report timestamp

**RLS Policies:**
- SELECT/INSERT: Users can view and create their own reports
- UPDATE/DELETE: Not allowed

---

## Enums

### video_category
- `education`
- `commercial`
- `fiction`
- `podcast`
- `entertainment`
- `tutorial`
- `other`

### ai_solution
- `NanoBanana`
- `Veo`
- `Sora`
- `Runway`
- `Pika`
- `Other`

### badge_type
- `best`: Best creator badge
- `official`: Official/verified badge

---

## Database Functions

### handle_new_user()
**Trigger:** AFTER INSERT on auth.users
**Purpose:** Auto-creates profile when user signs up
**Security:** DEFINER with search_path = public

### update_updated_at_column()
**Trigger:** BEFORE UPDATE on profiles, videos
**Purpose:** Auto-updates updated_at timestamp
**Security:** DEFINER with search_path = public

### update_playlist_updated_at()
**Trigger:** BEFORE UPDATE on playlists
**Purpose:** Auto-updates playlist updated_at
**Security:** DEFINER with search_path = public

### update_watch_history_timestamp()
**Trigger:** BEFORE UPDATE on watch_history
**Purpose:** Updates watched_at when video is rewatched
**Security:** DEFINER with search_path = public

### update_likes_count()
**Trigger:** AFTER INSERT/DELETE on likes
**Purpose:** Maintains videos.likes_count counter
**Security:** DEFINER with search_path = public

---

## Storage Buckets

### videos
- **Public:** Yes
- **Purpose:** Store uploaded video files
- **Structure:** `{user_id}/{video_id}.{ext}`
- **RLS:** Users can upload/update/delete their own videos

### thumbnails
- **Public:** Yes
- **Purpose:** Store video thumbnails, profile avatars, and banners
- **Structure:** 
  - Videos: `{user_id}/thumb_{video_id}.{ext}`
  - Avatars: `{user_id}/avatar.{ext}`
  - Banners: `{user_id}/banner.{ext}`
- **RLS:** Users can upload/update/delete their own files

---

## Security Considerations

1. **RLS Enabled:** All tables have Row Level Security enabled
2. **SECURITY DEFINER:** All functions use SECURITY DEFINER with explicit search_path
3. **Foreign Keys:** Proper CASCADE rules on all foreign keys
4. **Unique Constraints:** Prevent duplicate likes, favorites, etc.
5. **Public Access:** Videos and profiles are publicly viewable by design
6. **Private Data:** Watch history, favorites, and user preferences are private

---

## Performance Optimizations

1. **Indexes on Foreign Keys:** All FK columns are indexed
2. **Composite Indexes:** For common query patterns (e.g., sorting by date)
3. **GIN Indexes:** For full-text search on title and tags
4. **Partial Indexes:** For filtered queries (e.g., public playlists)
5. **Trigger-based Counters:** Denormalized likes_count for performance
6. **Unique Constraints:** Serve as indexes and prevent duplicates
