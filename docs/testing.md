# 🧪 RezGenie Testing Guide

> Quick reference for testing the app before deployment

---

## 🚀 Quick Start (5 min)

### Start Servers
```bash
# Backend (Terminal 1)
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn main:app --reload

# Frontend (Terminal 2)
cd frontend
npm run dev
```

### Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Run Checks
```bash
cd frontend && npm run build && npm run lint
```

---

## ✅ Current Status

**Build:** ✅ PASSING (30.7s)  
**TypeScript:** ✅ 0 errors  
**ESLint:** ⚠️ 44 warnings (minor cleanup needed)  
**Recent Fixes:** ✅ All 10 UI/UX fixes working

---

## 🧪 Essential Tests (30 min)

### Critical Flows
- [ ] Register & Login
- [ ] Dashboard (stats, activity, recommendations)
- [ ] Job Discovery (search, filter, save, mobile swipe)
- [ ] My Jobs (view, status change, notes)
- [ ] Resume Upload (PDF/DOCX)
- [ ] Genie Wishes (create, view results)
- [ ] Profile (edit, change password)

### Mobile (iPhone SE 375px)
- [ ] All pages responsive
- [ ] Cards don't overflow
- [ ] Dropdowns visible
- [ ] Text wraps properly

### Browsers
- [ ] Chrome, Firefox, Safari, Edge
- [ ] Mobile Safari/Chrome

---

## 🔧 API Endpoints

**Auth:** `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`  
**Resumes:** `/resumes/` (GET/POST)  
**Jobs:** `/jobs/` (GET with filters)  
**Genie:** `/genie/` (POST), `/genie/guest` (POST)  
**Profile:** `/users/profile` (GET/PUT)

---

## 🐛 Bug Report Template

```
Bug: [description]
Steps: 1. 2. 3.
Expected: [what should happen]
Actual: [what happens]
Browser/Device: [Chrome/iPhone]
Priority: [Critical/High/Medium/Low]
```

---

## 📊 Quality Checks

**Performance:** Page load < 3s, API < 1s, Lighthouse > 90  
**Code:** TypeScript passes, no critical errors  
**Security:** Auth required, input validation, no secrets in code

---

## 🚨 Known Issues (Minor)

- ⚠️ 24 unused imports (cleanup)
- ⚠️ 5 React Hook warnings
- ⚠️ 9 TypeScript `any` types

**No critical bugs** ✅

---

## ✅ Production Checklist

- [ ] All tests pass
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Cross-browser tested
- [ ] Performance > 90
- [ ] Security verified
- [ ] Env variables set

---

## 🆘 Troubleshooting

```bash
# Frontend issues
cd frontend && rm -rf node_modules .next && npm install

# Backend issues
cd backend && pip install -r requirements.txt

# Port in use: kill process and restart
```

**Check:** Browser console (F12), both servers running, clear cache

---

## 🎯 Success Criteria

App is ready when all critical paths work, no errors, mobile responsive, performance > 90, cross-browser compatible.

**Time to Production:** 1-2 days after manual testing

---

**Last Updated:** November 2025 
**Status:** 🟢 Ready for Manual Testing
