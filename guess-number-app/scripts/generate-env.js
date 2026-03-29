const fs = require('fs');
const path = require('path');

// Load .dev.env or .prod.env
const envFile = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '..', '..', 'env', '.prod.env')
  : path.join(__dirname, '..', '..', 'env', '.dev.env');

if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
}

const dir = path.join(__dirname, '..', 'src', 'environments');
fs.mkdirSync(dir, { recursive: true });

const content = `export const environment = {
  production: ${process.env.NODE_ENV === 'production'},
  googleClientId: '${process.env.GOOGLE_CLIENT_ID || ''}',
};
`;

fs.writeFileSync(path.join(dir, 'environment.ts'), content);
console.log('Generated environment.ts with GOOGLE_CLIENT_ID from env');
