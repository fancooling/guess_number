const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dir = path.join(__dirname, '..', 'src', 'app', 'environments');
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

fs.writeFileSync(path.join(dir, 'environment.ts'), content);
console.log('Generated src/app/environments/environment.ts from .env');
