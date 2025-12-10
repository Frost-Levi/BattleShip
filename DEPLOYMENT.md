# Quick Deployment Guide - Railway

## 1. Deploy to Railway in 3 Steps

### Step 1: Go to Railway
- Visit https://railway.app
- Click "Start a New Project"
- Sign in with GitHub

### Step 2: Select Your Repository
- Choose "Deploy from GitHub repo"
- Find and select: `Frost-Levi/BattleShip`
- Click "Deploy Now"

### Step 3: Done! 🎉
Railway will automatically:
- Detect it's a Node.js project
- Install dependencies (`npm install`)
- Start the server (`npm start`)
- Give you a live URL like: `https://battleship-xxx.railway.app`

## 2. Test Your Deployment

1. Open your Railway URL in browser
2. Click "Online Play"
3. Create a room and test with a friend!

## 3. How It Works

**No code changes needed!** The `OnlineManager.js` automatically:
- On localhost → Connects to `http://localhost:3000`
- On Railway → Connects to `https://battleship-xxx.railway.app`
- Anywhere else → Connects to the deployed server

## Troubleshooting

**"Connection refused"**
- Wait 1-2 minutes for Railway to fully deploy
- Check Railway dashboard for build errors

**"Can't create room"**
- Make sure you're using HTTPS (not HTTP) on production
- Railway automatically provides HTTPS

**Need to update code after deploy?**
- Just push to GitHub: `git push`
- Railway automatically redeploys on push

## Environment Check

Railway automatically sets `NODE_ENV=production` in deployment, and our server handles it perfectly!

---

**That's it!** Your online Battleship game is now live for the world to play! 🚀⚓
