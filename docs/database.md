# 🗄️ Database Connection Guide

## Connecting to PostgreSQL with DBeaver

The RezGenie PostgreSQL database is running in Docker and can be accessed using any PostgreSQL client.

### Connection Details

| Setting | Value |
|---------|-------|
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database** | `rezgenie` |
| **Username** | `postgres` |
| **Password** | `postgres123` |
| **Driver** | PostgreSQL |

### DBeaver Setup Steps

1. **Open DBeaver** and click "New Database Connection" (or press `Ctrl+Shift+N`)

2. **Select PostgreSQL** from the database list

3. **Enter Connection Details:**
   - Host: `localhost`
   - Port: `5432`
   - Database: `rezgenie`
   - Username: `postgres`
   - Password: `postgres123`

4. **Test Connection** - Click "Test Connection" to verify it works

5. **Finish** - Click "Finish" to save the connection

### Important Tables

#### Core Tables

- **`users`** - User accounts and authentication
- **`resumes`** - Uploaded resumes with extracted text and embeddings
- **`jobs`** - Job postings from Adzuna (886 jobs currently)
- **`user_preferences`** - Job search preferences (skills, titles, salary, location)

#### Job Matching Tables

- **`job_comparisons`** - Resume-to-job comparison results with match scores
- **`job_swipes`** - User swipe actions (like/pass) on jobs
- **`saved_jobs`** - Jobs saved by users with status tracking

#### Analytics Tables

- **`genie_wishes`** - AI-powered resume optimization requests
- **`reports`** - Generated career reports and insights

### Useful Queries

#### View All Jobs
```sql
SELECT 
    id,
    title,
    company,
    location,
    remote,
    salary_min,
    salary_max,
    posted_at,
    tags
FROM jobs
ORDER BY posted_at DESC
LIMIT 20;
```

#### View Users
```sql
SELECT 
    id,
    email,
    full_name,
    created_at,
    is_active
FROM users;
```

#### View User Preferences
```sql
SELECT 
    up.id,
    u.email,
    up.skills,
    up.target_titles,
    up.location_pref,
    up.remote_ok,
    up.salary_min
FROM user_preferences up
JOIN users u ON up.user_id = u.id;
```

#### View Job Match Scores
```sql
SELECT 
    jc.id,
    u.email,
    jc.job_title,
    jc.company_name,
    jc.overall_match_score,
    jc.skills_match_score,
    jc.processing_status,
    jc.created_at
FROM job_comparisons jc
JOIN users u ON jc.user_id = u.id
ORDER BY jc.created_at DESC;
```

#### View Saved Jobs
```sql
SELECT 
    sj.id,
    u.email,
    j.title,
    j.company,
    sj.status,
    sj.saved_at
FROM saved_jobs sj
JOIN users u ON sj.user_id = u.id
JOIN jobs j ON sj.job_id = j.id
ORDER BY sj.saved_at DESC;
```

#### Job Statistics
```sql
-- Total jobs by provider
SELECT 
    provider,
    COUNT(*) as job_count,
    COUNT(job_embedding) as jobs_with_embeddings
FROM jobs
GROUP BY provider;

-- Recent jobs (last 7 days)
SELECT COUNT(*) as recent_jobs
FROM jobs
WHERE posted_at >= NOW() - INTERVAL '7 days';

-- Jobs by location
SELECT 
    location,
    COUNT(*) as count
FROM jobs
WHERE location IS NOT NULL
GROUP BY location
ORDER BY count DESC
LIMIT 10;
```

### Database Schema Diagram

```
users
  ├── resumes (one-to-many)
  ├── user_preferences (one-to-one)
  ├── job_comparisons (one-to-many)
  ├── job_swipes (one-to-many)
  ├── saved_jobs (one-to-many)
  └── genie_wishes (one-to-many)

jobs
  ├── job_swipes (one-to-many)
  └── saved_jobs (one-to-many)

resumes
  └── job_comparisons (one-to-many)
```

### Troubleshooting

#### Can't Connect?

1. **Check if Docker is running:**
   ```bash
   docker ps
   ```
   You should see `rezgenie_postgres` in the list.

2. **Check if port 5432 is accessible:**
   ```bash
   docker exec rezgenie_postgres pg_isready -U postgres
   ```

3. **Restart the database container:**
   ```bash
   docker-compose restart postgres
   ```

#### Connection Refused?

Make sure the PostgreSQL container is healthy:
```bash
docker ps --filter name=rezgenie_postgres
```

If it shows "unhealthy", check the logs:
```bash
docker logs rezgenie_postgres
```

### Direct psql Access (Alternative)

If you prefer command-line access:

```bash
# Connect to database
docker exec -it rezgenie_postgres psql -U postgres -d rezgenie

# List all tables
\dt

# Describe a table
\d jobs

# Run a query
SELECT COUNT(*) FROM jobs;

# Exit
\q
```

### Backup Database

To create a backup:
```bash
docker exec rezgenie_postgres pg_dump -U postgres rezgenie > backup.sql
```

To restore from backup:
```bash
cat backup.sql | docker exec -i rezgenie_postgres psql -U postgres -d rezgenie
```

---

**Note:** The database is running inside Docker, so it's only accessible while the containers are running. Use `docker-compose up -d` to start all services.
