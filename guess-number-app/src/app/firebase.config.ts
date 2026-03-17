import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../environments/environment';

// Firebase config from environment
// For local: edit src/environments/environment.ts
// For Cloud Run: set via --set-env-vars at deploy time (see deploy.sh)
export const firebaseConfig = {
  apiKey: environment.firebase.apiKey,
  authDomain: environment.firebase.authDomain,
  projectId: environment.firebase.projectId,
  storageBucket: environment.firebase.storageBucket,
  messagingSenderId: environment.firebase.messagingSenderId,
  appId: environment.firebase.appId
};

export const dbName = environment.firebase.dbName || '(default)';

// Validate config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn('Firebase config not set. Edit src/environments/environment.ts');
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, dbName);
