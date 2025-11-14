# 🚀 RezGenie Deployment Guide

**Status:** Production-ready | **Time:** 30-45 minutes

---

## Platform Comparison

| Platform | Cost | Best For |
|----------|------|----------|
| **Render.com** ⭐ | Free-$35 | Free tier demo, easy upgrade |
| **Railway.app** | $20-30 | Production (easiest setup) |
| **VPS (Hetzner)** | $10-20 | Full control (manual) |

---

## Quick Deploy (Render.com)

### 1. Cloudflare R2 Storage Setup (5 min)

1. Create R2 bucket at [dash.cloudflare.com](https://dash.cloudflare.com) → R2
2. Name: `rezgenie-uploads`
3. Generate API token (Read/Write permissions)
4. Save: Access Key ID, Secret Key, Account ID
5. Endpoint: `https://{ACCOUNT_ID}.r2.cloudflarestorage.com`

### 2. Render Backend Setup (15 min)

1. Login to [render.com](https://render.com)
2. **New Web Service** → Connect GitHub repo
3. Configure:
   - Name: `rezgenie-backend`
   - Environment: `Docker`
   - Region: Choose closest
   - Instance: Free (or Starter $7/mo)
4. **Add PostgreSQL** → Create new database (Free tier)
5. **Add Redis** (optional, $7/mo for caching)

### 3. Environment Variables (10 min)

Add to Render Web Service → Environment:
```bash
# Database (auto-filled from Render PostgreSQL)
DATABASE_URL=postgresql://...

# OpenAI
OPENAI_API_KEY=sk-...

# Security
JWT_SECRET_KEY=<generate-32-char-secret>

# R2 Storage
MINIO_ENDPOINT={ACCOUNT_ID}.r2.cloudflarestorage.com
MINIO_ACCESS_KEY={R2_ACCESS_KEY}
MINIO_SECRET_KEY={R2_SECRET_KEY}
MINIO_BUCKET_NAME=rezgenie-uploads

# Config
ENVIRONMENT=production
DEBUG=false

# Redis (if using)
REDIS_URL=redis://...

# CORS (update with your Netlify URL)
BACKEND_CORS_ORIGINS=["https://your-app.netlify.app"]
```

### 4. Deploy & Verify (5 min)

1. Click **Create Web Service** (auto-deploys)
2. Wait for build (~5 min)
3. Test: `https://your-service.onrender.com/docs`
4. Update frontend `.env`: `NEXT_PUBLIC_API_URL=https://your-service.onrender.com`

---

## Deployment Stack

### Free Tier (Demo)

- Frontend: Netlify ✅ (already deployed)
- Backend: Render Free
- Database: Render PostgreSQL Free
- Storage: Cloudflare R2 (10GB free)
- **Total: $0**

### Production

- Frontend: Netlify (free)
- Backend: Render Starter ($7/mo) or Railway ($20-30/mo)
- Database: Included
- Redis: $7/mo (optional)
- Storage: R2 (free 10GB)
- **Total: $7-30/mo**

---

## Checklist

**Pre-Deploy:**
- [ ] All tests passing
- [ ] Docker build works locally
- [ ] Generate strong JWT secret (32+ chars)

**Deploy:**
- [ ] R2 bucket created with API credentials
- [ ] Render PostgreSQL created
- [ ] All environment variables set
- [ ] Service deployed successfully

**Post-Deploy:**
- [ ] Test `/docs` endpoint
- [ ] Test file upload
- [ ] Test authentication
- [ ] Update frontend API URL
- [ ] Enable pgvector: `CREATE EXTENSION IF NOT EXISTS vector;`

---

## Troubleshooting

**Cold starts (free tier):** First request ~30-60s (normal, upgrade to $7/mo for instant)

**pgvector missing:** Run in Render PostgreSQL shell:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**File uploads fail:** Verify R2 credentials and endpoint format

**CORS errors:** Add frontend URL to `BACKEND_CORS_ORIGINS`

---

## Production Upgrade

When ready for production:
1. Upgrade Render instance to Starter ($7/mo) for no cold starts
2. Add Redis ($7/mo) for better caching
3. Or migrate to Railway ($20-30/mo) for full managed stack

**Need detailed steps?** See backend `README.md` for platform-specific guides.
