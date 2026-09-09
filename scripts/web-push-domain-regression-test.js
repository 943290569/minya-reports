const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'web-push-notifications.js'), 'utf8');

if (!source.includes("process.env.WEB_PUSH_SUBJECT || 'https://alminya-landfill.duckdns.org'")) {
  throw new Error('Web Push default subject must use the canonical Al-Minya domain');
}
if (source.includes("'https://minya-landfill.duckdns.org'")) {
  throw new Error('Legacy Web Push default subject domain must not return');
}

console.log('Web Push canonical domain regression check passed.');
