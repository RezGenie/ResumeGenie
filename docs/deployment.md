# 🚀 RezGenie Deployment Guide

**Status:** Production-ready | **Time:** 30-45 minutes

---

## 🎯 Current Setup

**Live Deployment:**

- ✅ **Frontend**: Netlify (Free) - `https://rezgenie.netlify.app`
- ✅ **Backend**: Render (Free tier) - `https://rezgenie-api.onrender.com`
- ✅ **Database**: Render PostgreSQL (Free)
- ✅ **Storage**: Cloudflare R2 (Free 10GB)
- ⚡ **Status**: Running on free tier - cold starts (~30-60s on first request)

**Note**: Production upgrade to Render Starter ($7/mo) eliminates cold starts for instant responses.

---

## 📊 Platform Comparison

| Platform | Cost | Best For |
|----------|------|----------|
| **Render.com** ⭐ | Free-$35 | Free tier demo, easy upgrade |
| **Railway.app** | $20-30 | Production (easiest setup) |
| **VPS (Hetzner)** | $10-20 | Full control (manual) |

---

## 💰 Cost Overview

### Free Tier (Demo)

- Frontend: Netlify ✅ Free
- Backend: Render Free
- Database: Render PostgreSQL Free
- Storage: Cloudflare R2 (10GB free)
- **Total: $0** (cold starts ~30-60s)

### Production

- Frontend: Netlify (free)
- Backend: Render Starter ($7/mo) or Railway ($20-30/mo)
- Database: Included
- Redis: $7/mo (optional, recommended)
- Storage: R2 (free 10GB)
- **Total: $7-30/mo** (instant, no cold starts)

---

## 📋 Prerequisites

Create accounts on:

- [Netlify](https://www.netlify.com/)
- [Render](https://render.com/)
- [Cloudflare](https://www.cloudflare.com/)
- [OpenAI](https://platform.openai.com/)

---

## Part 1: Backend Deployment on Render

### Step 1: Cloudflare R2 Storage Setup (5 min)

1. **Log in to Cloudflare** → **R2** → **Create bucket**
2. **Configure bucket**:
   - Name: `rezgenie-uploads`
   - Location: Automatic
3. Click **Create bucket**
4. **Create API Token**:
   - R2 → **Manage R2 API Tokens** → **Create API token**
   - Permissions: **Object Read & Write**
   - Click **Create API Token**
5. **Copy these values** (you won't see them again):
   - Access Key ID
   - Secret Access Key
   - Account ID
   - Endpoint format: `https://[account-id].r2.cloudflarestorage.com`

### Step 2: Create PostgreSQL Database (5 min)

1. **Log in to Render** → Click **New +** → **PostgreSQL**
2. **Configure database**:
   - Name: `rezgenie-db`
   - Database: `rezgenie`
   - User: `rezgenie_user` (or leave default)
   - Region: Choose closest to you
   - Plan: **Free** (or Starter $7/mo for production)
3. Click **Create Database**
4. **Copy the Internal Database URL** - you'll need this later
5. **Enable pgvector extension** (after database is created):
   - Go to your database → **Shell** tab
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`

### Step 3: Create Redis Instance (5 min, optional but recommended)

1. In Render → Click **New +** → **Redis**
2. **Configure Redis**:
   - Name: `rezgenie-redis`
   - Region: Same as your database
   - Plan: **Free** (or Starter $7/mo for production)
3. Click **Create Redis**
4. **Copy the Internal Redis URL** - you'll need this later

### Step 4: Deploy Backend to Render (15 min)

1. **Push your code to GitHub** (if not already):

   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. In Render → Click **New +** → **Web Service**

3. **Connect repository**:
   - Connect your GitHub account
   - Select the `ResumeGenie` repository
   - Click **Connect**

4. **Configure service**:
   - Name: `rezgenie-api`
   - Region: Same as database/redis
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: **Docker**
   - Plan: **Free**

5. **Add Environment Variables** - Click **Advanced** → **Add Environment Variable**:

   Add each of these (replace values with your actual credentials):

   ```bash
   # Database (from Step 2 - use Internal Database URL)
   DATABASE_URL=postgresql://[your-internal-db-url]
   
   # Redis (from Step 3 - use Internal Redis URL, optional)
   REDIS_URL=redis://[your-internal-redis-url]
   
   # Storage - Cloudflare R2 (from Step 1)
   R2_ENDPOINT=https://[your-account-id].r2.cloudflarestorage.com
   R2_ACCESS_KEY=[your-access-key]
   R2_SECRET_KEY=[your-secret-key]
   R2_BUCKET_NAME=rezgenie-uploads
   
   # OpenAI API
   OPENAI_API_KEY=[your-openai-api-key]
   OPENAI_MODEL=gpt-4
   
   # Security - Generate with: openssl rand -hex 32
   JWT_SECRET_KEY=[generate-random-32-char-string]
   
   # Application Settings
   ENVIRONMENT=production
   DEBUG=false
   LOG_LEVEL=info
   
   # CORS - Your frontend domain (update after Part 2)
   BACKEND_CORS_ORIGINS=["https://your-site.netlify.app"]
   
   # Rate Limiting
   DAILY_GENIE_WISHES=3
   
   # Optional: Job Search API (Adzuna)
   ADZUNA_APP_ID=[your-app-id]
   ADZUNA_APP_KEY=[your-app-key]
   ```

   **To generate JWT_SECRET_KEY**, run in terminal:

   ```bash
   openssl rand -hex 32
   ```

6. Click **Create Web Service**

7. **Wait for deployment** (~5-10 minutes)
   - Docker build will take a few minutes
   - Watch the logs for any errors

8. **Verify deployment**:
   - Once deployed, click on your service URL (e.g., `https://rezgenie-api.onrender.com`)
   - Test health endpoint: `https://rezgenie-api.onrender.com/api/v1/health`
   - You should see: `{"status":"healthy",...}`
   - Test API docs: `https://rezgenie-api.onrender.com/docs`

9. **Copy your backend URL** - you'll need it for frontend (e.g., `https://rezgenie-api.onrender.com`)

---

## Part 2: Frontend Deployment on Netlify

### Step 1: Deploy to Netlify (10 min)

1. **Log in to Netlify** → **Add new site** → **Import an existing project**

2. **Connect to Git**:
   - Choose **GitHub**
   - Authorize Netlify
   - Select `ResumeGenie` repository

3. **Configure build settings**:
   - Branch: `main`
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/.next`

4. **Add Environment Variables** - Click **Show advanced** → **New variable**:

   ```bash
   NEXT_PUBLIC_API_URL=https://rezgenie-api.onrender.com/api/v1
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[your-stripe-publishable-key]
   ```

   Replace `rezgenie-api.onrender.com` with your actual Render backend URL from Part 1, Step 4.9.

5. Click **Deploy site**

6. **Wait for deployment** (~2-5 minutes)

7. **Copy your site URL** (e.g., `https://rezgenie.netlify.app`)

### Step 2: Update Backend CORS (5 min)

Now that you have your Netlify URL, update your backend:

1. **Go back to Render** → Your backend service → **Environment**

2. **Find BACKEND_CORS_ORIGINS** variable and update it:

   ```bash
   BACKEND_CORS_ORIGINS=["https://your-actual-site.netlify.app"]
   ```

3. **Save** - Render will automatically redeploy (~2 minutes)

### Step 3: Test Your Deployment (5 min)

1. Open your Netlify site in a browser
2. **Test authentication**: Create an account - should work without CORS errors
3. **Test file upload**: Upload a resume - tests storage integration
4. **Test AI features**: Use the Genie - tests OpenAI integration
5. **Test job search**: Browse jobs (if Adzuna configured)

---

## ✅ Deployment Checklist

### Pre-Deploy

- [ ] All tests passing locally
- [ ] Docker build works locally
- [ ] Generated strong JWT secret (32+ chars)
- [ ] OpenAI API key obtained
- [ ] (Optional) Adzuna API credentials obtained
- [ ] (Optional) Stripe keys for subscriptions

### During Deploy

- [ ] ✅ R2 bucket created with API credentials
- [ ] ✅ Render PostgreSQL created
- [ ] ✅ pgvector extension enabled
- [ ] ✅ Redis created (optional)
- [ ] ✅ All environment variables set correctly
- [ ] ✅ Backend service deployed successfully
- [ ] ✅ Frontend deployed to Netlify
- [ ] ✅ CORS updated with frontend URL

### Post-Deploy

- [ ] ✅ Backend `/health` endpoint returns healthy
- [ ] ✅ API docs accessible at `/docs`
- [ ] ✅ User registration works
- [ ] ✅ File upload works
- [ ] ✅ AI analysis works
- [ ] ✅ No CORS errors in browser console

---

## 🔧 Troubleshooting

### Cold Starts (Free Tier)

**Problem:** First request takes 30-60 seconds
**Solution:** This is normal for free tier. Upgrade to Starter ($7/mo) for instant responses.

### pgvector Missing

**Problem:** Database errors about vector extension
**Solution:** Run in Render PostgreSQL shell:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### File Uploads Fail

**Problem:** Error uploading files
**Solution:**

- Verify R2 credentials are correct
- Check endpoint format: `https://[account-id].r2.cloudflarestorage.com`
- Ensure bucket name matches exactly
- Check Access Key has Read & Write permissions

### CORS Errors

**Problem:** Browser shows CORS policy errors
**Solution:**

- Add your Netlify URL to `BACKEND_CORS_ORIGINS` in Render
- Format: `["https://your-site.netlify.app"]` (JSON array with quotes)
- Wait for Render to redeploy after changing environment variables

### OpenAI API Errors

**Problem:** AI features not working
**Solution:**

- Verify `OPENAI_API_KEY` is set correctly
- Check you have credits in your OpenAI account
- Ensure `OPENAI_MODEL` is set to `gpt-4` or `gpt-3.5-turbo`

### Database Connection Issues

**Problem:** Backend can't connect to database
**Solution:**

- Use the **Internal Database URL**, not external
- Ensure URL format: `postgresql://user:pass@host:port/dbname`
- Check database is in the same region as backend

---

## 🚀 Production Upgrade Path

When ready for production (no cold starts, better performance):

### Option 1: Render Upgrade

1. Upgrade backend to **Starter** ($7/mo) - eliminates cold starts
2. Add **Redis Starter** ($7/mo) - improves caching
3. Upgrade database to **Starter** ($7/mo) - better performance
**Total: ~$21/mo**

### Option 2: Railway Migration

1. One-click deploy to Railway
2. Fully managed PostgreSQL + Redis included
3. No cold starts, automatic scaling
**Total: $20-30/mo**

### Option 3: VPS Hosting (Advanced)

1. Hetzner VPS ($5-10/mo)
2. Self-managed Docker deployment
3. Full control, manual updates required
**Total: $5-10/mo + time investment**

---

## 📚 Additional Resources

- **Backend Documentation**: See `backend/README.md` for detailed API docs
- **Frontend Documentation**: See `frontend/README.md` for development guide
- **Database Schema**: See `docs/database.md` for schema details
- **Testing Guide**: See `docs/testing.md` for test coverage

---

## 🆘 Need Help?

- Check the [GitHub Issues](https://github.com/RezGenie/RezGenie/issues)
- Review backend logs in Render dashboard
- Test API endpoints using the `/docs` interface
- Verify all environment variables are set correctly

---

**Deployment complete! 🎉** Your RezGenie instance should now be live and ready to use.
