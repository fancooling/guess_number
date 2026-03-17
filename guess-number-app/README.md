# GuessNumberApp

A cross-platform number guessing game built with Angular and Capacitor.

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

### 3. Enable Authentication

1. Go to **Build** → **Authentication**
2. Click "Get started"
3. Enable these providers:
   - **Anonymous** - for Guest mode
   - **Google** - for Google Sign-In

### 4. Get Firebase Config

1. Go to Project Settings (gear icon ⚙️)
2. Scroll to "Your apps" → click web icon `</>`
3. Register app: name = `guess-number-app`
4. Copy the `firebaseConfig` object

### 5. Update Firebase Config

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
    appId: "YOUR_APP_ID"
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
```

Note: `.env` is already in `.gitignore` - do NOT commit it.

## Deployment to Cloud Run

### Option 1: Set environment variables before deploy

```bash
export FIREBASE_API_KEY=your_api_key
export FIREBASE_PROJECT_ID=your_project_id
export FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
export FIREBASE_STORAGE_BUCKET=your_project.appspot.com
export FIREBASE_MESSAGING_SENDER_ID=your_sender_id
export FIREBASE_APP_ID=your_app_id

./deploy.sh
```

### Option 2: Edit environment.ts directly

Edit `src/app/environments/environment.ts` with production values before deploying.

## Syncing to Other Machines

1. **Use a password manager** (1Password, Bitwarden) to share the Firebase config values

2. **Create a shared secrets file** (not in git):
   ```bash
   # On Machine A - export your vars to a file (manually, not in git)
   # Share this file securely via password manager, USB, etc.

   # On Machine B - source the file:
   source ~/path/to/secrets.env
   ./deploy.sh
   ```

3. **Use Cloud Run secrets** (most secure):
   - Go to Google Cloud Console → Secret Manager
   - Create secrets for each Firebase config value
   - Grant Cloud Run service account access to secrets
   - Reference secrets in deploy.sh

## Development

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
