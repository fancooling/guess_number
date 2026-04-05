# Guess Number Game

A multiplayer number guessing game with Angular frontend, NestJS backend, Redis database, and Docker Compose deployment.

## Architecture

```
nginx (reverse proxy, port 80/443)
  ├── / → app:3000 (Angular static files via NestJS ServeStaticModule)
  ├── /api/* → app:3000 (NestJS REST endpoints)
  └── /socket.io/* → app:3000 (WebSocket for real-time rooms)

app (NestJS + Angular, port 3000)
  └── connects to redis:6379

redis (data persistence with AOF)
```

## Project Structure

```
guess_number/
├── guess-number-app/          # Application source
│   ├── src/
│   │   ├── app/               # Angular frontend
│   │   ├── server/            # NestJS backend
│   │   │   ├── auth/          # Google Auth + JWT
│   │   │   ├── player/        # Player stats & leaderboard
│   │   │   ├── game/          # Number generation & evaluation
│   │   │   ├── room/          # Multiplayer rooms (WebSocket)
│   │   │   └── redis/         # Redis connection
│   │   └── common/            # Shared types & utils
│   ├── Dockerfile             # Multi-stage: build Angular+NestJS, run Node
│   ├── package.json
│   ├── tsconfig.json          # Angular TypeScript config
│   └── tsconfig.server.json   # NestJS TypeScript config
├── deploy/
│   ├── docker-compose.yml     # 3 containers: app, redis, nginx
│   └── deploy.sh              # Deployment script (app-only by default, --all for full)
├── scripts/
│   ├── start_dev.sh           # Start local dev server
│   ├── build_android.sh       # Build Android APK/AAB (--production for release)
│   ├── redis_web.sh           # Launch Redis Commander web UI
│   └── test.sh                # Run server-side tests
├── config/
│   ├── nginx.conf             # Reverse proxy + WebSocket upgrade
│   └── redis.conf             # AOF persistence enabled
├── env/
│   ├── .prod.env              # Production environment variables
│   └── .dev.env               # Development environment variables
└── README.md
```

## Google OAuth Setup

### 1. Create OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**
2. Click **Create Credentials** -> **OAuth client ID**
3. Application type: **Web application**
4. Name: `Guess Number Game` (or any name)
5. **Authorized JavaScript origins**:
   - `http://localhost:4200` (for local dev)
   - `https://guessnumber.flamebots.org` (for production)
6. **Authorized redirect URIs**:
   - `http://localhost:4200` (for local dev)
   - `https://guessnumber.flamebots.org` (for production)
7. Click **Create** and copy the **Client ID** (looks like `579215986794-xxxxxxxx.apps.googleusercontent.com`)

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** -> **OAuth consent screen**
2. Choose **External** user type
3. Fill in app name, support email, developer email
4. Add scopes: `email`, `profile`, `openid`
5. If in **Testing** status, add your test email under **Test users**
6. Publish the app when ready for production

### 3. Set GOOGLE_CLIENT_ID

Put your Client ID in two places:

1. **Environment file** (`env/.dev.env` or `env/.prod.env`):
   ```
   GOOGLE_CLIENT_ID=579215986794-xxxxxxxx.apps.googleusercontent.com
   ```

2. **Frontend code** (`guess-number-app/src/app/services/auth.service.ts`):
   Update the `client_id` value in the `initGoogleSignIn()` method.

## JWT Secret

`JWT_SECRET` is a random string used to sign authentication tokens. Generate one:

```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Put the generated value in `env/.dev.env` and `env/.prod.env`:
```
JWT_SECRET=your-generated-random-string
```

Use **different secrets** for dev and production.

## Local Development

### Prerequisites
- Node.js 18+ (22+ for Docker builds)
- Redis running locally (`sudo apt install redis-server && redis-server`)

### Setup

```bash
cd guess-number-app
npm install
```

### Configure environment

1. Copy and edit `env/.dev.env` with your `GOOGLE_CLIENT_ID` and `JWT_SECRET` (see sections above)
2. Update `GOOGLE_CLIENT_ID` in `src/app/services/auth.service.ts`

### Run (frontend + backend concurrently)

```bash
# From project root:
./scripts/start_dev.sh

# Or from guess-number-app/:
npm run start:dev
```

This starts:
- Angular dev server on `http://localhost:4200` (with proxy to backend)
- NestJS backend on `http://localhost:3000`

### Build

```bash
npm run build:all
```

## Production Deployment (VPS + Docker Compose)

### Prerequisites
- A VPS (e.g., OVHcloud, DigitalOcean, Linode) with Ubuntu/Debian
- A domain pointing to the VPS IP (e.g., `guessnumber.flamebots.org`)

### Step 1: Install Docker on VPS

SSH into your VPS and run:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Log out and back in for group change to take effect
exit
```

SSH back in and verify:
```bash
docker --version
docker compose version
```

### Step 2: Clone the repo

```bash
git clone <your-repo-url> ~/code/guess_number
cd ~/code/guess_number
```

### Step 3: Create production environment file

The `env/` directory is not in git (contains secrets). Create it manually:

```bash
mkdir -p env
nano env/.prod.env
```

Paste the following (replace values):
```
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=<generate with: openssl rand -base64 32>
GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
NODE_ENV=production
PORT=3000
```

Save and exit (`Ctrl+X`, `Y`, `Enter`).

### Step 4: Configure DNS

Add an A record for your domain pointing to your VPS IP:
- **Type**: A
- **Name**: `guessnumber` (or `@` for root domain)
- **Value**: your VPS IP address
- **TTL**: 300

### Step 5: Update Google OAuth for production

In [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials** -> your OAuth Client:

Add to **Authorized JavaScript origins**:
- `https://guessnumber.flamebots.org`

Add to **Authorized redirect URIs**:
- `https://guessnumber.flamebots.org`

### Step 6: Deploy

```bash
cd ~/code/guess_number/deploy

# Default: rebuild and restart app only (redis and nginx stay running)
./deploy.sh

# Full deploy: rebuild all services (app, redis, nginx)
./deploy.sh --all
```

This builds and starts 3 Docker containers:
| Container | Image | Role |
|-----------|-------|------|
| **app** | Custom (Node.js) | NestJS backend + Angular static files |
| **redis** | redis:7-alpine | Database with AOF persistence |
| **nginx** | nginx:alpine | Reverse proxy (port 80) |

### Step 7: Verify

```bash
# Check all containers are running
docker compose ps

# Check logs
docker compose logs -f

# Test the site
curl http://guessnumber.flamebots.org
```

Open `http://guessnumber.flamebots.org` in your browser.

### Updating after code changes

On your VPS:
```bash
cd ~/code/guess_number
git pull
cd deploy
./deploy.sh            # Rebuilds app only (fast, keeps redis/nginx running)
./deploy.sh --all      # Full redeploy if redis/nginx config changed
```

### Useful commands

```bash
# View logs
cd ~/code/guess_number/deploy
docker compose logs -f          # All containers
docker compose logs -f app      # App only

# Restart a single container
docker compose restart app

# Stop everything
docker compose down

# Stop and remove data (Redis data lost!)
docker compose down -v

# Check Redis data
docker compose exec redis redis-cli KEYS '*'
```

## API Reference

### REST Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/google` | No | Google sign-in (send idToken) |
| POST | `/api/auth/guest` | No | Guest sign-in |
| GET | `/api/players/leaderboard` | No | Top 100 players |
| GET | `/api/players/:uid` | No | Player stats |
| GET | `/api/players/profile` | JWT | Get player profile |
| POST | `/api/players/profile` | JWT | Update display name & leaderboard opt-in |
| DELETE | `/api/players/account` | JWT | Delete account and all data |
| POST | `/api/players/game-result` | JWT | Save solo game win |

### WebSocket Events (namespace: `/rooms`)
| Direction | Event | Payload |
|-----------|-------|---------|
| C→S | `subscribe:rooms` | — |
| C→S | `create:room` | `{ name }` |
| C→S | `join:room` | `{ roomId }` |
| C→S | `leave:room` | — |
| C→S | `start:game` | `{ length }` |
| C→S | `make:guess` | `{ guess }` |
| C→S | `restart:game` | `{ length }` |
| S→C | `room:list` | `Room[]` |
| S→C | `room:update` | `Room` |
| S→C | `room:deleted` | `{ roomId }` |
| S→C | `turn:timer` | `{ remaining }` |
| S→C | `room:error` | `{ message }` |
