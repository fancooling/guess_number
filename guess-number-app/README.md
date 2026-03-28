# GuessNumberApp

A cross-platform number guessing game built with Angular and Capacitor. Supports single-player and multiplayer game rooms with real-time turn-based gameplay.

## Features

- **Single Player** - Guess a 3, 4, or 5 digit number with green/yellow light feedback
- **Google Auth & Guest Mode** - Sign in with Google or play as a guest
- **Multiplayer Game Rooms** - Create or join rooms (1-3 players), take turns guessing in real-time
  - Round-robin turns with 60-second timer per turn
  - Real-time updates via Firestore listeners
  - Keep-alive mechanism (auto-removes inactive players after 2 minutes)
  - Room creator controls game start and can restart after each round
- **Leaderboard** - Rankings by total wins, including room wins
- **Player Stats** - Per-digit-length win counts and average guesses
- **Cross-Platform** - Runs on web, Android (Capacitor), and iOS (Capacitor)

## Firebase Setup

### 1. Create Firebase Project

```bash
npm install -g firebase-tools
firebase login
```

1. Go to [console.firebase.google.com](https://console.firebase.google.com/)
2. Click "Add project" → name it (e.g., `guess-number-game`)
3. Disable Google Analytics → Create project

### 2. Enable Firestore Database

1. Go to **Build** → **Firestore Database**
2. Click "Create database"
3. Choose location: `us-central1`
4. Select **Production mode** (or Test mode for development)
5. Click "Enable"

### 3. Firestore Security Rules

In **Firestore Database** → **Rules**, set:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /players/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    match /rooms/{roomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.token.firebase.sign_in_provider != 'anonymous';
      allow update: if request.auth != null && request.auth.token.firebase.sign_in_provider != 'anonymous';
      allow delete: if request.auth != null && resource.data.creatorId == request.auth.uid;
    }
  }
}
```

### 4. Enable Authentication

1. Go to **Build** → **Authentication**
2. Click "Get started"
3. Enable these providers:
   - **Anonymous** - for Guest mode
   - **Google** - for Google Sign-In

### 5. Get Firebase Config

1. Go to Project Settings (gear icon)
2. Scroll to "Your apps" → click web icon `</>`
3. Register app: name = `guess-number-app`
4. Copy the `firebaseConfig` object

### 6. Update Firebase Config

Edit `src/app/environments/environment.ts` with your Firebase config:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    dbName: "YOUR_DB_NAME"
  }
};
```

## Environment Variables

### Option 1: Environment.ts (Recommended for local dev)

Edit `src/app/environments/environment.ts` with your Firebase config values.

### Option 2: .env file (Alternative)

Create `.env` file in this directory:

```bash
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_DB_NAME=your_db_name
```

Note: `.env` is already in `.gitignore` - do NOT commit it.

## Development

```bash
npm start
```

Opens dev server at `http://localhost:4200/`. To test multiplayer, open two browser tabs and sign in with Google in both.

## Deployment to Cloud Run

The deploy script builds the Docker image via Cloud Build (passing Firebase config as build args) and deploys to Cloud Run.

### Option 1: Set environment variables before deploy

```bash
export FIREBASE_API_KEY=your_api_key
export FIREBASE_PROJECT_ID=your_project_id
export FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
export FIREBASE_STORAGE_BUCKET=your_project.appspot.com
export FIREBASE_MESSAGING_SENDER_ID=your_sender_id
export FIREBASE_APP_ID=your_app_id
export FIREBASE_DB_NAME=your_db_name

./deploy.sh
```

### Option 2: Use a .env file

Create a `.env` file with the values above. The deploy script sources it automatically.

### Option 3: Edit environment.ts directly

Edit `src/app/environments/environment.ts` with production values before deploying.

## Project Structure

```
src/app/
├── components/
│   ├── leader-board/        # Leaderboard modal
│   ├── player-stats/        # Player stats detail modal
│   ├── room-list/           # Room browser (create/join rooms)
│   ├── room-lobby/          # Waiting room before game starts
│   └── room-game/           # Multiplayer game view
├── models/
│   ├── player-stats.ts      # Player/leaderboard interfaces
│   └── room.ts              # Room/game state interfaces
├── services/
│   ├── auth.service.ts      # Firebase Auth (Google + Guest)
│   ├── firestore.service.ts # Player stats & leaderboard CRUD
│   ├── game.service.ts      # Single-player game logic
│   └── room.service.ts      # Room CRUD, real-time sync, keep-alive, turn timer
├── utils/
│   └── guess-evaluator.ts   # Shared guess evaluation logic
├── app.component.ts/html    # Root component
├── app.config.ts            # Angular + Firebase providers
└── firebase.config.ts       # Firebase initialization
```

## Build

```bash
ng build
```

Build artifacts are stored in the `dist/` directory.

## Running unit tests

```bash
ng test
```

## Further help

To get more help on the Angular CLI use `ng help` or check the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
