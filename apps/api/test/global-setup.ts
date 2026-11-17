import { execFileSync } from 'node:child_process';

import { testDatabaseUrl } from './test-database.js';

/** Aplica as migrações no banco de teste. */
export default function setup(): void {
  const env = { ...process.env, DATABASE_URL: testDatabaseUrl() };
  execFileSync('node_modules/.bin/prisma', ['migrate', 'deploy'], { env, stdio: 'inherit' });
}
