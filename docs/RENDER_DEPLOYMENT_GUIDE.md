# ResumeGenie Render Deployment Guide

**Objective:** Deploy ResumeGenie backend to Render with production-ready configuration using Cloudflare R2 for storage and PostgreSQL for database.

**Time Estimate:** 30-45 minutes

---

## Prerequisites

Before starting, you need:

1. **GitHub Account** - Already have your repo there
2. **Render Account** - Free tier available at https://render.com
3. **Cloudflare Account** - For R2 storage (https://www.cloudflare.com/products/r2/)
4. **Netlify Deployed Frontend** - Already deployed ✅
5. **OpenAI API Key** - From https://platform.openai.com/api-keys

---

## Step 1: Set Up Cloudflare R2 Storage

### 1.1 Create R2 Bucket

1. Log in to **Cloudflare Dashboard** (https://dash.cloudflare.com/)
2. Go to **R2** section (left sidebar)
3. Click **Create Bucket**
4. Name it: `rezgenie-uploads`
5. Choose region closest to your servers
6. Click **Create Bucket**

### 1.2 Generate R2 API Credentials

1. In Cloudflare, go to **R2 → API Tokens** (left sidebar)
2. Click **Create API Token**
3. Select **Permissions:**
   - Choose **Object -> Read/Write**
   - Select **Include: All buckets in account** (or specific bucket)
4. Click **Create API Token**
5. Copy and save these values:
   - **Access Key ID** (like: `046dbc9b58f735752a350dafd41a0c0e`)
   - **Secret Access Key** (like: `3a415c56334ca92028f9d312ee93e6394340fdb88489c42d4c714532cbbbb632`)
   - **Account ID** (found at top of R2 dashboard, like: `b2b0ac013f1c98643597019e92c58ab1`)

6. Your **R2 Endpoint URL** will be:
   ```
   https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
   ```
   Example: `https://b2b0ac013f1c98643597019e92c58ab1.r2.cloudflarestorage.com`

✅ **R2 is now ready!**

---

## Step 2: Deploy to Render

### 2.1 Connect GitHub Repository

1. Go to **Render Dashboard** (https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Click **Connect a repository**
4. Select **GitHub** and authorize if needed
5. Find and select your **ResumeGenie** repository
6. Click **Connect**

### 2.2 Configure Web Service

**Basic Settings:**
- **Name:** `rezgenie-api`
- **Environment:** `Docker` (it will auto-detect your Dockerfile)
- **Region:** Choose closest to you (or same as DB)
- **Branch:** `render_deployment`

**Build Command:**
```bash
cd backend && pip install -r requirements.txt && alembic upgrade head
```

**Start Command:**
```bash
cd backend && gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

**Advanced Settings:**
- **Auto-deploy:** Yes (redeploy on git push)

Click **Create Web Service** and wait for initial build (5-10 minutes)

### 2.3 Create PostgreSQL Database

1. In Render Dashboard, click **New +** → **PostgreSQL**
2. **Database Name:** `rezgenie`
3. **Region:** Same as web service
4. **PostgreSQL Version:** 15 (or latest)
5. Click **Create Database**
6. Wait for creation (2-5 minutes)
7. Copy the **External Database URL** from the database info page

### 2.4 Create Redis Instance (Optional but Recommended)

1. Click **New +** → **Redis**
2. **Name:** `rezgenie-redis`
3. **Region:** Same as web service
4. **Max Memory Policy:** `noevict`
5. Click **Create Redis**
6. Wait for creation and copy the **Redis URL**

---

## Step 3: Configure Environment Variables

### 3.1 Add Environment Variables to Web Service

1. Go to your **rezgenie-api** service in Render
2. Click **Settings** tab
3. Scroll to **Environment** section
4. Add these variables (use values from previous steps):

#### Critical Variables:

```
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info

DATABASE_URL=<paste your PostgreSQL URL here>
REDIS_URL=<paste your Redis URL here>
CELERY_BROKER_URL=<paste your Redis URL here>
CELERY_RESULT_BACKEND=<paste your Redis URL here>

STORAGE_PROVIDER=r2
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY=<your R2 Access Key ID>
R2_SECRET_KEY=<your R2 Secret Access Key>
R2_BUCKET_NAME=rezgenie-uploads

JWT_SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_urlsafe(32))">
OPENAI_API_KEY=sk-proj-<your OpenAI key>
OPENAI_MODEL=gpt-4o-mini

CORS_ORIGINS=["https://your-frontend-name.netlify.app"]
```

#### Optional Variables:

```
ADZUNA_APP_ID=<if using job search>
ADZUNA_APP_KEY=<if using job search>
MAX_FILE_SIZE=10485760
DAILY_GENIE_WISHES=3
RATE_LIMIT_PER_MINUTE=60
```

### 3.2 Update Frontend CORS (if needed)

In your Netlify frontend, update the API endpoint to point to your Render backend:

```typescript
// In your frontend config/environment
const API_URL = process.env.REACT_APP_API_URL || "https://rezgenie-api.onrender.com/api/v1";
```

Add to Netlify environment variables:
```
REACT_APP_API_URL=https://rezgenie-api.onrender.com/api/v1
```

---

## Step 4: Verify Deployment

### 4.1 Check Build Status

1. Go to your **rezgenie-api** service
2. Click **Logs** tab
3. Look for:
   - ✅ Dependencies installed successfully
   - ✅ Database migrations applied (`alembic upgrade head`)
   - ✅ Server started on 0.0.0.0:8000

### 4.2 Test Health Endpoint

```bash
curl https://rezgenie-api.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": {"status": "healthy", "details": {"connection": "ok", "type": "postgresql"}},
    "openai": {"status": "configured"}
  }
}
```

### 4.3 Test API Endpoints

**Health Check:**
```bash
curl https://rezgenie-api.onrender.com/health
```

**API Docs (only in dev mode):**
```bash
# In production with DEBUG=false, docs are disabled (expected)
curl https://rezgenie-api.onrender.com/docs
# Returns: 404 (correct - docs disabled in production)
```

---

## Step 5: Configure Frontend

### 5.1 Update Netlify Backend URL

In your **Netlify Environment Variables**, add:

```
REACT_APP_API_URL=https://rezgenie-api.onrender.com/api/v1
```

Or update your frontend code:

```typescript
// src/lib/api/client.ts or similar
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://rezgenie-api.onrender.com/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
```

### 5.2 Redeploy Frontend

1. Push changes to GitHub (or redeploy via Netlify)
2. Netlify will automatically rebuild and deploy

---

## Step 6: Test End-to-End

### 6.1 Test Authentication Flow

```bash
# 1. Register user
curl -X POST https://rezgenie-api.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# 2. Login
curl -X POST https://rezgenie-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# 3. Use token in subsequent requests
curl https://rezgenie-api.onrender.com/api/v1/resumes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6.2 Test File Upload

Test resume upload in your frontend UI:
1. Log in to your frontend
2. Upload a PDF or DOCX resume
3. Verify it's stored in R2 (check Cloudflare dashboard)
4. Verify it appears in database

### 6.3 Test Frontend Integration

1. Visit your Netlify frontend: `https://your-app.netlify.app`
2. Sign up with new account
3. Upload resume
4. Test Genie wish feature
5. Verify all API calls succeed

---

## Troubleshooting

### Issue: Build fails with database migration error

**Solution:**
```bash
# Check logs in Render dashboard
# Ensure DATABASE_URL is correct
# Verify PostgreSQL is running

# Manually run migrations (Render shell):
cd backend && alembic upgrade head
```

### Issue: "ModuleNotFoundError: No module named 'psycopg2'"

**Solution:**
- Ensure `psycopg2-binary==2.9.9` is in requirements.txt
- Rebuild: Click "Clear build cache" and redeploy

### Issue: Uploads fail to R2

**Solution:**
- Verify R2 bucket exists: `rezgenie-uploads`
- Check R2 credentials are correct (no spaces, copy exactly)
- Verify R2 bucket URL in `R2_ENDPOINT`

### Issue: CORS errors from frontend

**Solution:**
- Update `CORS_ORIGINS` in Render with exact frontend URL
- Format: `["https://your-domain.netlify.app"]` (no trailing slash)
- Restart the service after updating

### Issue: "Redis connection refused"

**Solution:**
- If using Render Redis, verify it's created and running
- If not using Redis, set `CELERY_BROKER_URL` to alternative backend
- Or disable Celery by removing from code

### Issue: Slow uploads

**Solution:**
- Render free tier has bandwidth limits
- Consider upgrading or using Render Pro
- Implement chunked uploads in frontend

---

## Monitoring & Maintenance

### 4.1 Set Up Error Alerts

1. In Render dashboard, go to **Settings** → **Alerts**
2. Add email notifications for:
   - Build failures
   - Deploy failures
   - Service crashes

### 4.2 Monitor Logs

```bash
# View logs in real-time
curl https://api.render.com/v1/logs/your-service-id?key=YOUR_API_KEY
```

Or use Render Dashboard → **Logs** tab

### 4.3 Database Backups

1. Go to PostgreSQL database in Render
2. Enable **Automated Backups**
3. Set retention to at least 30 days

### 4.4 Monitor Performance

Track in Render Dashboard:
- **CPU Usage** (should be <50%)
- **Memory Usage** (should be <512MB)
- **Disk Usage** (monitor for growth)

---

## Scaling Guide (When needed)

### If you hit free tier limits:

1. **Upgrade Web Service:** Render Pro ($7/month)
   - More resources, custom domains, better performance
   
2. **Upgrade Database:** PostgreSQL Paid Tier
   - Automated backups, better uptime
   
3. **Add CDN:** Integrate Cloudflare
   - Cache static assets, faster downloads

---

## Rollback Procedure

If deployment goes wrong:

1. Go to Render Dashboard → **Your Web Service**
2. Click **Deployments** tab
3. Find previous successful deployment
4. Click **"Redeploy"** on that version

---

## Final Checklist

- [ ] ✅ R2 bucket created and credentials saved
- [ ] ✅ PostgreSQL database created on Render
- [ ] ✅ Redis created on Render (optional)
- [ ] ✅ Web service connected to GitHub
- [ ] ✅ All environment variables added to Render
- [ ] ✅ Build completed successfully
- [ ] ✅ Health endpoint returns "healthy"
- [ ] ✅ Database migrations ran successfully
- [ ] ✅ Frontend URL updated to Render API
- [ ] ✅ CORS configured with Netlify domain
- [ ] ✅ End-to-end test successful (register, login, upload)
- [ ] ✅ Monitoring and alerts configured

---

## Support Resources

- **Render Docs:** https://render.com/docs
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **Cloudflare R2 Docs:** https://developers.cloudflare.com/r2/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

## Summary

**Your ResumeGenie stack is now:**
- ✅ Frontend: Running on Netlify
- ✅ Backend: Running on Render
- ✅ Database: PostgreSQL on Render
- ✅ Storage: Cloudflare R2
- ✅ Caching: Redis on Render
- ✅ Production-ready with monitoring

**Estimated monthly cost (Render Free tier):**
- Web Service: Free
- PostgreSQL: Free (limited)
- Redis: Free (limited)
- **Total: $0** (upgrade as you grow)

**Next Steps:**
1. Monitor logs for errors
2. Gather user feedback
3. Scale when hitting limits
4. Plan for additional features

---

*Last Updated: November 10, 2025*
*Status: Production Ready ✅*
