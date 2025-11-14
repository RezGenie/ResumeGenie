# RezGenie Deployment Guide

**Stack**: Netlify (frontend), Render (backend + database + Redis), Cloudflare R2 (storage)

**Time**: ~30-45 minutes

## Prerequisites

Create accounts on:
- [Netlify](https://www.netlify.com/)
- [Render](https://render.com/)
- [Cloudflare](https://www.cloudflare.com/)
- [OpenAI](https://platform.openai.com/)

## Part 1: Backend Deployment on Render

### Step 1: Create PostgreSQL Database

1. **Log in to Render** → Click **New +** → **PostgreSQL**
2. **Configure database**:
   - Name: `rezgenie-db`
   - Database: `rezgenie`
   - User: `rezgenie_user` (or leave default)
   - Region: Choose closest to you
   - Plan: **Free**
3. Click **Create Database**
4. **Copy the Internal Database URL** - you'll need this later

### Step 2: Create Redis Instance

1. In Render → Click **New +** → **Redis**
2. **Configure Redis**:
   - Name: `rezgenie-redis`
   - Region: Same as your database
   - Plan: **Free**
3. Click **Create Redis**
4. **Copy the Internal Redis URL** - you'll need this later

### Step 3: Setup Cloudflare R2 Storage

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
   - Endpoint (looks like: `https://[account-id].r2.cloudflarestorage.com`)

### Step 4: Deploy Backend to Render

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
   # Database (from Step 1 - use Internal Database URL)
   DATABASE_URL=postgresql://[your-internal-db-url]
   
   # Redis (from Step 2 - use Internal Redis URL)
   REDIS_URL=redis://[your-internal-redis-url]
   
   # Storage - Cloudflare R2 (from Step 3)
   STORAGE_PROVIDER=r2
   R2_ENDPOINT=https://[your-account-id].r2.cloudflarestorage.com
   R2_ACCESS_KEY=[your-access-key]
   R2_SECRET_KEY=[your-secret-key]
   R2_BUCKET_NAME=rezgenie-uploads
   
   # CORS - Your frontend domain (you'll get this in Part 2)
   CORS_ORIGINS=https://your-site.netlify.app
   
   # OpenAI API
   OPENAI_API_KEY=[your-openai-api-key]
   
   # Application Settings
   ENVIRONMENT=production
   DEBUG=false
   JWT_SECRET_KEY=[generate-random-32-char-string]
   
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

8. **Verify deployment**:
   - Once deployed, click on your service URL (e.g., `https://rezgenie-api.onrender.com`)
   - Add `/health` to URL: `https://rezgenie-api.onrender.com/health`
   - You should see: `{"status":"healthy",...}`

9. **Copy your backend URL** - you'll need it for frontend

---

## Part 2: Frontend Deployment on Netlify

### Step 1: Deploy to Netlify

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
   REACT_APP_API_URL=https://rezgenie-api.onrender.com/api/v1
   ```
   
   Replace `rezgenie-api.onrender.com` with your actual Render backend URL.

5. Click **Deploy site**

6. **Wait for deployment** (~2-5 minutes)

7. **Copy your site URL** (e.g., `https://rezgenie.netlify.app`)

### Step 2: Update Backend CORS

Now that you have your Netlify URL, update your backend:

1. **Go back to Render** → Your backend service → **Environment**

2. **Find CORS_ORIGINS** variable and update it:
   ```bash
   CORS_ORIGINS=https://your-actual-site.netlify.app
   ```

3. **Save** - Render will automatically redeploy (~2 minutes)

### Step 3: Test Your Deployment

1. Open your Netlify site in a browser
2. Create an account - should work without CORS errors
3. Upload a resume - tests storage integration
4. Try AI features - tests OpenAI integration
