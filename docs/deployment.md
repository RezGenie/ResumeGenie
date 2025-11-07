# 🚀 RezGenie Deployment Guide

## Current Status
- **Environment:** Development
- **Deployment:** Docker Compose (local)
- **Status:** Ready for production deployment

---

## 📊 Backend Deployment Options - Quick Comparison

| Platform | Monthly Cost | Pros | Cons |
|----------|-------------|------|------|
| **Railway.app** ⭐ | $20-30 | Easiest setup, Docker native, pgvector support, auto-scaling | No native MinIO |
| **Render.com** ⭐ | Free-$35 | Free tier, Docker support, pgvector, auto-deploy | Cold starts on free tier |
| **Fly.io** | $15-25 | Full control, can run MinIO, global edge | More complex setup |
| **DigitalOcean** | $30-50 | Reliable, managed services, Spaces storage | Higher cost |
| **VPS (Hetzner)** | $10-20 | Cheapest, full control, run docker-compose as-is | Manual management |

---

## 🏆 Top 2 Recommendations

### 1. Railway.app (Best Overall) ⭐

**Why Railway:**
- Easiest setup for Docker containers
- Native PostgreSQL + Redis plugins
- Auto-scaling and zero-downtime deploys
- GitHub auto-deploy integration
- Perfect for capstone demo

**Setup Steps:**
1. Deploy Docker container directly
2. Add PostgreSQL + Redis plugins
3. Switch MinIO → Cloudflare R2 (free 10GB)
4. GitHub auto-deploy
5. **Setup time:** 30 minutes

**Cost:** $20-30/month for production-ready setup

**Storage Solution:**
- Replace MinIO with **Cloudflare R2**
  - Free 10GB storage
  - S3-compatible (works with existing boto3 code)
  - Zero egress fees
  - Only need to change 2 env vars

---

### 2. Render.com (Best Free Start) ⭐

**Why Render:**
- Free tier for testing
- Same stack support as Railway
- Upgrade to $25/month for production
- **Setup time:** 45 minutes

**Perfect for:**
- Capstone presentation (free tier)
- Upgrade later for production

---

## 🗄️ Storage Solution

### Replace MinIO with Cloudflare R2

**Why Cloudflare R2:**
- ✅ Free 10GB storage
- ✅ S3-compatible (works with existing boto3 code)
- ✅ Zero egress fees
- ✅ Only need to change 2 env vars

**Migration Steps:**
```python
# Current MinIO config
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin

# New Cloudflare R2 config
MINIO_ENDPOINT=<account-id>.r2.cloudflarestorage.com
MINIO_ACCESS_KEY=<r2-access-key>
```

No code changes needed - R2 is S3-compatible!

---

## 🎯 Recommended Deployment Stack

### For Capstone Presentation:
```
Frontend: Vercel (free, auto-deploy from GitHub)
Backend: Render.com (free tier)
Database: Render PostgreSQL (free tier)
Storage: Cloudflare R2 (free 10GB)
Redis: Render Redis (free tier)
```

**Total Cost:** $0 (perfect for demo!)

### For Production:
```
Frontend: Vercel ($0 - hobby plan)
Backend: Railway.app ($20-30/month)
Database: Railway PostgreSQL (included)
Storage: Cloudflare R2 (free 10GB)
Redis: Railway Redis (included)
```

**Total Cost:** ~$25/month

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Docker build successful
- [ ] Security audit complete

### Platform Setup
- [ ] Create Railway/Render account
- [ ] Connect GitHub repository
- [ ] Add PostgreSQL + Redis services
- [ ] Configure Cloudflare R2 bucket
- [ ] Set environment variables

### Environment Variables
```bash
# Required for production
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=<strong-32-char-secret>
REDIS_URL=redis://...
MINIO_ENDPOINT=<account>.r2.cloudflarestorage.com
MINIO_ACCESS_KEY=<r2-key>
MINIO_SECRET_KEY=<r2-secret>
ENVIRONMENT=production
DEBUG=false
```

### Post-Deployment
- [ ] Run database migrations
- [ ] Test file upload
- [ ] Test AI features
- [ ] Verify authentication
- [ ] Check logs for errors
- [ ] Test from mobile device

---

## 🚀 Quick Deploy Guide

### Railway.app (30 minutes)

1. **Create Railway Account**
   ```bash
   # Install Railway CLI (optional)
   npm install -g @railway/cli
   railway login
   ```

2. **Deploy Backend**
   - Connect GitHub repo
   - Railway auto-detects Dockerfile
   - Add PostgreSQL plugin
   - Add Redis plugin
   - Set environment variables

3. **Setup Cloudflare R2**
   - Create R2 bucket at dash.cloudflare.com
   - Generate API token
   - Update MINIO_ENDPOINT env var

4. **Deploy Frontend (Vercel)**
   - Connect GitHub repo
   - Set NEXT_PUBLIC_API_URL to Railway backend URL
   - Auto-deploy on push

**Done!** Your app is live 🎉

---

## 💡 Team Decision Points

**Questions to discuss:**
1. **Budget:** Free tier for demo or $25/month for production?
2. **Timeline:** Need free tier first, upgrade later?
3. **Comfort level:** Managed services (Railway) vs VPS (Hetzner)?

**Our Recommendation:** Start with Render.com free tier for capstone presentation, then upgrade to Railway.app ($25/month) if continuing development.

---

## 🆘 Troubleshooting

### Common Issues

**PostgreSQL pgvector not available:**
```bash
# Railway/Render: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

**File uploads failing:**
```bash
# Check Cloudflare R2 credentials
# Verify MINIO_ENDPOINT format
# Test with AWS CLI: aws s3 ls --endpoint-url=...
```

**Cold starts on free tier:**
- Expected on Render free tier
- First request takes 30-60 seconds
- Upgrade to paid tier for instant response

---

## 📞 Next Steps

1. **Team decides on platform** (Railway vs Render)
2. **Create deployment configs** (railway.json or render.yaml)
3. **Deploy in 1 hour** following quick guide above

**Ready to deploy?** Follow the Railway quick guide above! 🚀

## Environment Variables Checklist
- [ ] `OPENAI_API_KEY` - Production API key
- [ ] `DATABASE_URL` - Production database
- [ ] `JWT_SECRET_KEY` - Strong secret (32+ chars)
- [ ] `REDIS_URL` - Production Redis instance
- [ ] `MINIO_ENDPOINT` - Production S3/MinIO
- [ ] `ENVIRONMENT=production`
- [ ] `DEBUG=false`

## Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Security audit complete
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] SSL certificates ready
- [ ] Domain configured
