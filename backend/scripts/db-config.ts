import { Client, ClientConfig } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export function loadEnv(): void {
  const possiblePaths = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'backend/.env'),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const key = trimmed.substring(0, idx).trim();
            let val = trimmed.substring(idx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch {
        // ignore read errors
      }
    }
  }
}

export function getDbConfig(overrideDatabase?: string): ClientConfig {
  loadEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !overrideDatabase) {
    const isSsl = process.env.DATABASE_SSL === 'true' || databaseUrl.includes('sslmode=require');
    return {
      connectionString: databaseUrl,
      ssl: isSsl ? { rejectUnauthorized: false } : undefined,
    };
  }

  const isSsl = process.env.DATABASE_SSL === 'true';
  return {
    host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '5432', 10),
    user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || process.env.DB_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.DATABASE_PASS || process.env.DB_PASSWORD || 'postgres',
    database: overrideDatabase || process.env.DATABASE_NAME || process.env.DB_DATABASE || 'tender_discovery',
    ssl: isSsl ? { rejectUnauthorized: false } : undefined,
  };
}

export function createDbClient(overrideDatabase?: string): Client {
  return new Client(getDbConfig(overrideDatabase));
}
