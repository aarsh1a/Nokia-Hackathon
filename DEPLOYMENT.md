# Deployment Guide: Render + Vercel

This guide will walk you through deploying your Nokia Hackathon project:
- **Backend (Flask API)** → Render
- **Frontend (React + Vite)** → Vercel

---

## Prerequisites

1. **GitHub Account** - Your code should be pushed to a GitHub repository
2. **Render Account** - Sign up at [render.com](https://render.com) (free tier available)
3. **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free tier available)

---

## Part 1: Deploy Backend to Render

### Step 1: Prepare Backend for Deployment

The backend is already configured with:
- ✅ `requirements.txt` (includes flask-cors and gunicorn)
- ✅ `render.yaml` configuration file
- ✅ Flask app configured to run on port from environment variable

### Step 2: Push Code to GitHub

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 3: Create Render Web Service

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Click **"New +"** → **"Web Service"**

2. **Connect Repository**
   - Click **"Connect GitHub"** (if not already connected)
   - Authorize Render to access your repositories
   - Select your **Nokia-Hackathon** repository

3. **Configure Service**
   - **Name**: `nokia-hackathon-backend` (or any name you prefer)
   - **Region**: Choose closest to your users (e.g., `Oregon (US West)`)
   - **Branch**: `main`
   - **Root Directory**: `backend` ⚠️ **Important!**
   - **Environment**: `Python 3` (will use Python 3.11 from `runtime.txt`)
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
   - **Plan**: Select **Free** (or paid if you prefer)
   
   **Note**: The `runtime.txt` file ensures Python 3.11 is used (required for pandas compatibility)

4. **Environment Variables** (Optional)
   - You can add environment variables here if needed
   - For now, no additional variables are required

5. **Create Web Service**
   - Click **"Create Web Service"**
   - Render will start building and deploying your backend

### Step 4: Wait for Deployment

- Render will install dependencies and start your Flask app
- This usually takes 2-5 minutes
- You'll see build logs in real-time
- Once deployed, you'll get a URL like: `https://nokia-hackathon-backend.onrender.com`

### Step 5: Test Backend

Visit your backend URL:
- `https://your-backend-url.onrender.com/health` → Should return `{"status": "ok"}`
- `https://your-backend-url.onrender.com/` → Should show API endpoints

**⚠️ Note**: Render free tier services spin down after 15 minutes of inactivity. The first request after spin-down may take 30-60 seconds.

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Update Frontend API Configuration

The frontend is already configured to use environment variables. You'll set the backend URL in Vercel.

### Step 2: Create Vercel Project

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Click **"Add New..."** → **"Project"**

2. **Import Repository**
   - Click **"Import Git Repository"**
   - Select your **Nokia-Hackathon** repository
   - Click **"Import"**

3. **Configure Project**
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: `frontend` ⚠️ **Important!**
   - **Build Command**: `npm run build` (should be auto-filled)
   - **Output Directory**: `dist` (should be auto-filled)
   - **Install Command**: `npm install` (should be auto-filled)

4. **Environment Variables**
   - Click **"Environment Variables"**
   - Add a new variable:
     - **Key**: `VITE_API_URL`
     - **Value**: `https://your-render-backend-url.onrender.com` (use your actual Render URL)
     - **Environment**: Select all (Production, Preview, Development)
   - Click **"Save"**

5. **Deploy**
   - Click **"Deploy"**
   - Vercel will build and deploy your frontend
   - This usually takes 1-3 minutes

### Step 3: Get Your Frontend URL

- Once deployed, Vercel will provide a URL like: `https://nokia-hackathon-xyz.vercel.app`
- Your app is now live! 🎉

### Step 4: Test Frontend

- Visit your Vercel URL
- The frontend should connect to your Render backend
- Test all features to ensure everything works

---

## Part 3: Post-Deployment Configuration

### Update CORS Settings (if needed)

If you encounter CORS errors, make sure your backend `app.py` has:

```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # This allows all origins
```

For production, you might want to restrict CORS:

```python
CORS(app, origins=["https://your-frontend-url.vercel.app"])
```

### Environment Variables Summary

**Backend (Render)**:
- No additional environment variables needed (uses `$PORT` automatically)

**Frontend (Vercel)**:
- `VITE_API_URL`: Your Render backend URL (e.g., `https://nokia-hackathon-backend.onrender.com`)

---

## Troubleshooting

### Backend Issues

**Problem**: Backend returns 500 errors
- **Solution**: Check Render logs → Logs tab in Render dashboard
- Common issues: Missing dependencies, import errors, data files not found

**Problem**: Build fails with pandas compilation errors (Python 3.13 compatibility)
- **Solution**: Updated pandas to version 2.2.3+ which supports Python 3.13. The requirements.txt now uses `pandas>=2.2.3` which will work with Python 3.13 that Render uses by default.

**Problem**: Backend times out
- **Solution**: Render free tier has cold starts. First request after inactivity takes longer.

**Problem**: CORS errors
- **Solution**: Ensure `flask-cors` is installed and `CORS(app)` is called in `app.py`

### Frontend Issues

**Problem**: Frontend can't connect to backend
- **Solution**: 
  1. Verify `VITE_API_URL` is set correctly in Vercel
  2. Check backend URL is accessible (visit `/health` endpoint)
  3. Ensure backend CORS is configured correctly

**Problem**: Build fails on Vercel
- **Solution**: Check build logs in Vercel dashboard
- Common issues: Missing dependencies, TypeScript errors, build command issues

**Problem**: 404 errors on page refresh
- **Solution**: `vercel.json` already includes rewrite rules for SPA routing

---

## Updating Deployments

### Update Backend
```bash
git add .
git commit -m "Update backend"
git push origin main
```
Render will automatically redeploy.

### Update Frontend
```bash
git add .
git commit -m "Update frontend"
git push origin main
```
Vercel will automatically redeploy.

---

## Cost

- **Render Free Tier**: 
  - 750 hours/month free
  - Services spin down after 15 min inactivity
  - Perfect for demos and small projects

- **Vercel Free Tier**:
  - Unlimited deployments
  - 100GB bandwidth/month
  - Perfect for frontend hosting

Both platforms offer generous free tiers suitable for hackathon projects!

---

## Quick Reference

**Backend URL**: `https://your-backend.onrender.com`
**Frontend URL**: `https://your-frontend.vercel.app`

**Backend Health Check**: `https://your-backend.onrender.com/health`
**Backend API Docs**: `https://your-backend.onrender.com/`

---

## Need Help?

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- Check deployment logs in respective dashboards

Good luck with your deployment! 🚀
