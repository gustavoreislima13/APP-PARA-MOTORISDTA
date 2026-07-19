const fs = require('fs');
let code = fs.readFileSync('src/services/GoogleMapsService.ts', 'utf8');
code = code.replace(
  "const response = await fetch(url);",
  "const headers: Record<string, string> = {}; if (process.env.APP_URL) { headers['Referer'] = process.env.APP_URL; } const response = await fetch(url, { headers });"
);
fs.writeFileSync('src/services/GoogleMapsService.ts', code);
