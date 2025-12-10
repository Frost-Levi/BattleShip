# Running the Online Battleship Game

## Prerequisites

- Node.js installed (download from https://nodejs.org/)

## Local Setup

### 1. Install Dependencies

```powershell
cd path/to/BattleShip
npm install
```

### 2. Start the Server

```powershell
npm start
```

The server will start on `http://localhost:3000`

### 3. Play Online

- Open your browser to `http://localhost:3000`
- Click "Online Play"
- One player creates a room and shares the room code
- The other player joins with that room code

## Development Mode

For automatic server restart on file changes, use:

```powershell
npm run dev
```

(Requires nodemon to be installed)

## Deployment to Production

### Option 1: Deploy to Heroku

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Deploy: `git push heroku main`
5. Open: `heroku open`

### Option 2: Deploy to Railway.app

1. Go to https://railway.app
2. Connect your GitHub repository
3. Railway will automatically detect the Node.js app and deploy it

### Option 3: Deploy to Render

1. Go to https://render.com
2. Create a new Web Service
3. Connect your GitHub repository
4. Set Start Command to: `npm start`
5. Deploy

## Environment Variables

For production deployments, you may want to set `NODE_ENV=production`:

```powershell
$env:NODE_ENV = "production"
npm start
```

## Troubleshooting

**Port already in use:** Change the port in server.js
```javascript
const PORT = process.env.PORT || 3001;
```

**Socket.IO connection errors:** Make sure you're accessing the site over HTTP (not file://)

**CORS issues:** The server is configured to accept connections from any origin for development
