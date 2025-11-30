# Database Backup & Restore Procedures

## Overview
This document provides comprehensive procedures for backing up and restoring the Supabase PostgreSQL database.

---

## Backup Strategies

### 1. Supabase Automatic Backups (Lovable Cloud)

Supabase provides automatic daily backups:
- **Retention:** 7 days of daily backups
- **Timing:** Automatic during low-traffic periods
- **Location:** Managed by Supabase infrastructure
- **Access:** Via Supabase dashboard

**Accessing Backups:**
```
1. Open Lovable project
2. Navigate to Backend section
3. Access Supabase dashboard
4. Go to Database → Backups
5. View available backup points
```

---

### 2. Manual Database Export

#### Full Database Dump

**Via Supabase Dashboard:**
```sql
-- Export entire database schema and data
pg_dump -h your-db-host -U postgres -d postgres --clean --if-exists > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Export Only Schema:**
```sql
pg_dump -h your-db-host -U postgres -d postgres --schema-only > schema_backup_$(date +%Y%m%d_%H%M%S).sql
```

**Export Only Data:**
```sql
pg_dump -h your-db-host -U postgres -d postgres --data-only > data_backup_$(date +%Y%m%d_%H%M%S).sql
```

**Export Specific Tables:**
```sql
pg_dump -h your-db-host -U postgres -d postgres \
  -t public.profiles \
  -t public.videos \
  -t public.watch_history \
  > specific_tables_backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Create backup
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql
```

---

### 3. Automated Backup Script

Create a backup automation script:

**backup.sh:**
```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/path/to/backups"
PROJECT_REF="your-project-ref"
DB_PASSWORD="your-db-password"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Perform backup
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h db.your-project-ref.supabase.co \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Delete old backups
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log success
echo "$(date): Backup completed - $BACKUP_FILE.gz" >> "$BACKUP_DIR/backup.log"
```

**Make executable:**
```bash
chmod +x backup.sh
```

**Schedule with cron (daily at 2 AM):**
```bash
crontab -e
# Add line:
0 2 * * * /path/to/backup.sh
```

---

## Point-in-Time Recovery (PITR)

Supabase supports Point-in-Time Recovery for recovering data to a specific timestamp.

### Check Available Recovery Points

```sql
-- View available restore points
SELECT * FROM pg_available_extensions 
WHERE name = 'pg_stat_statements';

-- Check WAL (Write-Ahead Log) status
SELECT pg_current_wal_lsn();
```

### Create Manual Restore Point

```sql
-- Create named restore point
SELECT pg_create_restore_point('before_major_update');
```

**When to create restore points:**
- Before major migrations
- Before bulk data updates
- Before testing new features in production
- Before schema changes

---

## Restore Procedures

### 1. Full Database Restore

⚠️ **WARNING:** This will overwrite all existing data!

**Preparation:**
```sql
-- 1. Disconnect all clients
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'postgres' 
  AND pid <> pg_backend_pid();

-- 2. Verify no active connections
SELECT count(*) FROM pg_stat_activity 
WHERE datname = 'postgres';
```

**Restore from backup:**
```bash
# Decompress if needed
gunzip backup_20251130_120000.sql.gz

# Restore database
PGPASSWORD=$DB_PASSWORD psql \
  -h db.your-project-ref.supabase.co \
  -U postgres \
  -d postgres \
  < backup_20251130_120000.sql
```

**Verify restore:**
```sql
-- Check table counts
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check latest data
SELECT created_at FROM videos ORDER BY created_at DESC LIMIT 1;
SELECT created_at FROM profiles ORDER BY created_at DESC LIMIT 1;
```

---

### 2. Selective Table Restore

Restore specific tables without affecting others:

```bash
# Extract specific table from backup
pg_restore --table=videos backup.sql > videos_only.sql

# Or use pg_dump with -t flag
pg_dump -h source-db -U postgres -d postgres -t public.videos > videos_backup.sql

# Restore to target database
psql -h target-db -U postgres -d postgres < videos_backup.sql
```

---

### 3. Data-Only Restore

Restore data without modifying schema:

```bash
# Create data-only backup
pg_dump -h db-host -U postgres -d postgres --data-only > data_backup.sql

# Restore data only
psql -h db-host -U postgres -d postgres < data_backup.sql
```

---

### 4. Restore from Supabase Backup

**Via Dashboard:**
1. Access Supabase dashboard
2. Go to Database → Backups
3. Select backup point
4. Click "Restore" button
5. Confirm restore operation
6. Wait for completion (can take several minutes)

⚠️ **Note:** This creates a new database instance with the backup data.

---

## Testing Backups

### Backup Verification Checklist

```sql
-- 1. Test backup file integrity
gunzip -t backup.sql.gz

-- 2. Create test database
CREATE DATABASE test_restore;

-- 3. Restore to test database
psql -h localhost -U postgres -d test_restore < backup.sql

-- 4. Verify data integrity
-- Connect to test database
\c test_restore

-- Check row counts match production
SELECT 
  'videos' as table_name, 
  count(*) as count 
FROM videos
UNION ALL
SELECT 'profiles', count(*) FROM profiles
UNION ALL
SELECT 'watch_history', count(*) FROM watch_history;

-- 5. Check constraints and indexes
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- 7. Drop test database
DROP DATABASE test_restore;
```

---

## Disaster Recovery Plan

### Pre-Disaster Preparation

1. **Regular Backups:**
   - Daily automated backups
   - Weekly full database exports
   - Monthly backup verification tests

2. **Documentation:**
   - Keep connection details secure
   - Document restore procedures
   - Maintain contact information

3. **Testing:**
   - Quarterly disaster recovery drills
   - Test restores to staging environment
   - Verify backup integrity monthly

### Disaster Recovery Steps

**Level 1: Minor Data Loss (< 1 hour)**
```
1. Identify affected time range
2. Use PITR to restore to point before issue
3. Verify data integrity
4. Resume operations
```

**Level 2: Moderate Data Loss (< 1 day)**
```
1. Restore from latest daily backup
2. Re-apply recent transactions if available
3. Communicate with users about data loss
4. Verify all systems operational
```

**Level 3: Major Data Loss (> 1 day)**
```
1. Restore from most recent verified backup
2. Assess data loss extent
3. Manual data recovery where possible
4. Implement additional safeguards
5. Post-mortem analysis
```

---

## Storage Management

### Backup Storage Best Practices

1. **Multiple Locations:**
   - Primary: Local server
   - Secondary: Cloud storage (S3, Google Cloud Storage)
   - Tertiary: Offline storage

2. **Encryption:**
   ```bash
   # Encrypt backup
   gpg --encrypt --recipient your-email backup.sql
   
   # Decrypt backup
   gpg --decrypt backup.sql.gpg > backup.sql
   ```

3. **Compression:**
   ```bash
   # Best compression
   gzip -9 backup.sql
   
   # Fast compression
   gzip -1 backup.sql
   ```

4. **Cloud Upload:**
   ```bash
   # AWS S3
   aws s3 cp backup.sql.gz s3://your-bucket/backups/
   
   # Google Cloud Storage
   gsutil cp backup.sql.gz gs://your-bucket/backups/
   ```

---

## Monitoring Backups

### Backup Health Check Script

```bash
#!/bin/bash

BACKUP_DIR="/path/to/backups"
ALERT_EMAIL="admin@example.com"

# Check if backup exists for today
TODAY=$(date +%Y%m%d)
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_${TODAY}*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup found for today!" | mail -s "Backup Failure Alert" $ALERT_EMAIL
    exit 1
fi

# Check backup file size (should be > 1MB)
SIZE=$(stat -f%z "$LATEST_BACKUP" 2>/dev/null || stat -c%s "$LATEST_BACKUP")
if [ $SIZE -lt 1048576 ]; then
    echo "WARNING: Backup file unusually small: $SIZE bytes" | mail -s "Backup Size Alert" $ALERT_EMAIL
fi

# Test backup integrity
if ! gunzip -t "$LATEST_BACKUP" 2>/dev/null; then
    echo "ERROR: Backup file corrupted!" | mail -s "Backup Corruption Alert" $ALERT_EMAIL
    exit 1
fi

echo "$(date): Backup health check passed" >> "$BACKUP_DIR/health.log"
```

---

## Edge Function Data Export

### Export Edge Function Logs

```bash
# Via Supabase CLI
supabase functions logs recommend-videos --tail 1000 > function_logs.txt

# Filter by date range
supabase functions logs recommend-videos \
  --since "2025-11-01" \
  --until "2025-11-30" \
  > function_logs_november.txt
```

---

## Storage Bucket Backup

### Backup Video Files

```bash
#!/bin/bash

# Download all videos from storage bucket
supabase storage download videos \
  --output /path/to/video/backups/

# Backup thumbnails
supabase storage download thumbnails \
  --output /path/to/thumbnail/backups/

# Sync to cloud storage
aws s3 sync /path/to/video/backups/ s3://your-bucket/video-backups/
aws s3 sync /path/to/thumbnail/backups/ s3://your-bucket/thumbnail-backups/
```

---

## Recovery Time Objectives (RTO)

| Scenario | Target RTO | Procedure |
|----------|-----------|-----------|
| Single table corruption | < 30 minutes | Selective table restore |
| Recent data loss (< 1 hour) | < 1 hour | Point-in-Time Recovery |
| Full database corruption | < 2 hours | Full database restore |
| Complete system failure | < 4 hours | Restore from backup + verification |

---

## Best Practices

### DO's
✅ Test backups regularly (monthly minimum)  
✅ Store backups in multiple locations  
✅ Encrypt sensitive backups  
✅ Monitor backup success/failure  
✅ Document restore procedures  
✅ Keep backup retention policy documented  
✅ Create restore points before major changes  
✅ Verify backup integrity automatically  

### DON'Ts
❌ Don't rely on single backup location  
❌ Don't skip backup verification tests  
❌ Don't store backups indefinitely (costs)  
❌ Don't ignore backup failure alerts  
❌ Don't perform restores without testing first  
❌ Don't forget to backup storage buckets  
❌ Don't share backup credentials insecurely  

---

## Emergency Contacts

Document and keep updated:

```
Database Administrator: [Name] - [Email] - [Phone]
Supabase Support: support@supabase.com
Lovable Support: [Contact method]
On-Call Engineer: [Contact rotation]
```

---

## Compliance & Retention

### Data Retention Policy

```
Production Backups:
- Daily backups: 30 days
- Weekly backups: 90 days
- Monthly backups: 1 year
- Yearly backups: 7 years (compliance)

Development Backups:
- Daily backups: 7 days
- No long-term retention needed
```

### GDPR Considerations

If users request data deletion:
```sql
-- Before deletion, backup user data
BEGIN;

-- Export user data
COPY (
  SELECT * FROM profiles WHERE id = 'user-id'
) TO '/tmp/user_data_export.csv' WITH CSV HEADER;

-- Export related data
COPY (
  SELECT * FROM videos WHERE creator_id = 'user-id'
) TO '/tmp/user_videos_export.csv' WITH CSV HEADER;

-- Then proceed with deletion
DELETE FROM profiles WHERE id = 'user-id'; -- CASCADE handles related data

COMMIT;
```

---

## Quick Reference Commands

```bash
# Create full backup
pg_dump -h db-host -U postgres -d postgres > backup.sql

# Compress backup
gzip backup.sql

# Restore from backup
gunzip backup.sql.gz
psql -h db-host -U postgres -d postgres < backup.sql

# Test backup integrity
gunzip -t backup.sql.gz

# Create restore point
psql -h db-host -U postgres -d postgres \
  -c "SELECT pg_create_restore_point('backup_name');"

# Check backup file size
du -h backup.sql.gz

# List recent backups
ls -lh /path/to/backups/ | head -20
```

---

## Troubleshooting

### Backup Fails

**Problem:** pg_dump connection timeout
```bash
# Increase timeout
pg_dump --statement-timeout=300000 -h db-host -U postgres -d postgres > backup.sql
```

**Problem:** Disk space full
```bash
# Check available space
df -h

# Compress older backups
find /backups -name "*.sql" -mtime +7 -exec gzip {} \;

# Delete old backups
find /backups -name "*.sql.gz" -mtime +30 -delete
```

### Restore Fails

**Problem:** RLS policies blocking restore
```sql
-- Temporarily disable RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE videos DISABLE ROW LEVEL SECURITY;

-- Restore data
\i backup.sql

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
```

**Problem:** Foreign key violations
```sql
-- Restore with constraints deferred
BEGIN;
SET CONSTRAINTS ALL DEFERRED;
\i backup.sql
COMMIT;
```

---

## Version History

- 2025-11-30: Initial backup procedures documentation
