import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';

if (typeof process.loadEnvFile === 'function') {
  for (const envPath of ['.env', '../../.env', '../.env']) {
    const fullPath = path.resolve(process.cwd(), envPath);
    if (fs.existsSync(fullPath)) {
      try {
        process.loadEnvFile(fullPath);
        break;
      } catch {
        // ignore error
      }
    }
  }
}
// Configured for default postgres database
