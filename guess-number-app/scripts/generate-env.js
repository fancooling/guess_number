const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dir = path.join(__dirname, '..', 'src', 'environments');
const filePath = path.join(dir, 'environment.ts');

// Skip generation if no env vars are set and environment.ts already exists with real values
if (!process.env.FIREBASE_API_KEY && fs.existsSync(filePath)) {
  const existing = fs.readFileSync(filePath, 'utf8');
  if (existing.includes('apiKey') && !existing.includes("apiKey: ''")) {
    console.log('No env vars set, keeping existing environment.ts');
    process.exit(0);
  }
}

fs.mkdirSync(dir, { recursive: true });

const content = `export const environment = {
  firebase: {
    apiKey: '${process.env.FIREBASE_API_KEY || ''}',
    authDomain: '${process.env.FIREBASE_AUTH_DOMAIN || ''}',
    projectId: '${process.env.FIREBASE_PROJECT_ID || ''}',
    storageBucket: '${process.env.FIREBASE_STORAGE_BUCKET || ''}',
    messagingSenderId: '${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}',
    appId: '${process.env.FIREBASE_APP_ID || ''}',
    dbName: '${process.env.FIREBASE_DB_NAME || '(default)'}'
  }
};
`;

fs.writeFileSync(filePath, content);
console.log('Generated src/app/environments/environment.ts from .env');
