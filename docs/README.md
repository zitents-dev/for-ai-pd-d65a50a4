# Documentation

This directory contains comprehensive documentation for the AI Video Platform.

## Documents

### [SCHEMA.md](../SCHEMA.md)
Complete database schema documentation including:
- All tables with columns and types
- Indexes and performance optimizations
- RLS policies and security
- Database functions and triggers
- Storage buckets configuration

### [MIGRATIONS.md](./MIGRATIONS.md)
Database migration history and best practices:
- Complete migration timeline
- Migration patterns and templates
- Rollback procedures
- Common pitfalls to avoid

### [FUNCTIONS.md](../supabase/FUNCTIONS.md)
Edge Functions documentation:
- Function descriptions and usage
- API endpoints and parameters
- Error handling
- Performance considerations
- Adding new functions

## Quick Links

### For Developers
- [Database Schema](../SCHEMA.md) - Understanding data structure
- [Edge Functions](../supabase/FUNCTIONS.md) - Backend API reference
- [Migration Guide](./MIGRATIONS.md) - Database changes best practices

### For Database Admins
- [RLS Policies](../SCHEMA.md#security-considerations) - Row-level security setup
- [Performance](../SCHEMA.md#performance-optimizations) - Query optimization
- [Maintenance](./MIGRATIONS.md#database-maintenance) - Regular tasks

### For DevOps
- [Edge Functions](../supabase/FUNCTIONS.md) - Deployment and monitoring
- [Storage Buckets](../SCHEMA.md#storage-buckets) - File storage configuration
- [Environment Variables](../supabase/FUNCTIONS.md#environment-variables-required) - Configuration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Components: Home, VideoView, MyPage, Settings, etc  │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ├─── Supabase Client SDK
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                      Supabase Backend                         │
│                                                               │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │   PostgreSQL    │  │  Edge Functions  │  │  Storage   │ │
│  │                 │  │                  │  │            │ │
│  │ • profiles      │  │ • recommend-     │  │ • videos   │ │
│  │ • videos        │  │   videos         │  │ • thumbnails│ │
│  │ • likes         │  │                  │  │            │ │
│  │ • playlists     │  │ (Lovable AI)     │  │            │ │
│  │ • watch_history │  │                  │  │            │ │
│  │ • comments      │  │                  │  │            │ │
│  └─────────────────┘  └──────────────────┘  └────────────┘ │
│                                                               │
│  Row-Level Security (RLS) enforced on all tables            │
└───────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### Video Upload Flow
```
User → Upload Component → Supabase Storage (videos bucket)
     → Create video record in DB → Update UI
```

### Video Recommendation Flow
```
User → RecommendedVideos Component → Edge Function (recommend-videos)
     → Analyze watch history → Call Lovable AI
     → Return personalized recommendations → Display videos
```

### Profile Update Flow
```
User → Settings/MyPage → Update profile (with 14-day name cooldown check)
     → Upload avatar/banner to Storage → Update profiles table
     → Refresh UI
```

## Security Model

### Authentication
- JWT-based authentication via Supabase Auth
- User profiles created automatically on signup
- Session management via localStorage

### Authorization
- **Row-Level Security (RLS):** Enforced on all tables
- **Public Data:** Videos, profiles (view-only)
- **Private Data:** Watch history, favorites, user preferences
- **User-Owned Data:** Users can only modify their own content

### Content Filtering
- Age restriction tags on videos
- User preference filters (child, under-19, adult, sexual, violence/drugs)
- Applied client-side and optionally server-side

## Performance Considerations

### Database
- Indexes on all foreign keys
- Composite indexes for common query patterns
- GIN indexes for full-text search
- Trigger-based denormalized counters (likes_count)

### Edge Functions
- Uses Lovable AI for fast recommendations
- Caching opportunities for popular videos
- Request timeouts and error handling

### Frontend
- Lazy loading for video lists
- Image optimization with thumbnails
- Infinite scroll with pagination

## Monitoring & Debugging

### Edge Function Logs
```bash
# View logs in Lovable dashboard
# Each request includes user ID prefix for tracking
[userid] Action performed in Xms
```

### Database Queries
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;

-- Check table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size('public.' || tablename))
FROM pg_tables WHERE schemaname = 'public';
```

### RLS Policy Testing
```sql
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-uuid';
-- Test your queries
RESET ROLE;
```

## Common Operations

### Add New Table
1. Write migration SQL with RLS policies
2. Update SCHEMA.md documentation
3. Run migration via Supabase
4. Update TypeScript types (auto-generated)

### Add New Edge Function
1. Create function in `supabase/functions/`
2. Add CORS headers and error handling
3. Document in FUNCTIONS.md
4. Configure in `supabase/config.toml` if needed
5. Deploy (automatic)

### Update Profile Schema
1. Write migration to alter `profiles` table
2. Update Settings.tsx and MyPage.tsx components
3. Test with existing user data
4. Document in SCHEMA.md

## Troubleshooting

### Common Issues

**RLS Policy Blocking Access**
- Check policy using `SET ROLE` testing
- Verify `auth.uid()` matches expected user
- Check for circular references in policies

**Edge Function Timeout**
- Check function logs for errors
- Optimize database queries
- Consider caching frequently accessed data

**Storage Upload Fails**
- Verify bucket policies allow user upload
- Check file size limits
- Ensure correct folder structure

**Migration Conflicts**
- Use `IF NOT EXISTS` clauses
- Check migration order
- Test rollback procedures

## Contributing

When adding new features:
1. Update relevant documentation
2. Follow existing patterns
3. Add appropriate indexes
4. Write RLS policies
5. Test thoroughly
6. Document API changes
