import { createRequire } from 'node:module';
import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');
const { Pool } = pg;

export interface IDatabase {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid?: number | bigint }>;
  close(): Promise<void>;
}

class SQLiteDatabase implements IDatabase {
  private db: any;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  // Converts $1, $2, ... to ? and maps parameters by index
  private prepareSqlAndParams(sql: string, params: any[]): { formattedSql: string; mappedParams: any[] } {
    const mappedParams: any[] = [];
    const formattedSql = sql.replace(/\$([0-9]+)/g, (_, match) => {
      const index = parseInt(match, 10) - 1;
      const param = params[index];
      const safe = typeof param === 'boolean' ? (param ? 1 : 0) : (param === undefined ? null : param);
      mappedParams.push(safe);
      return '?';
    });
    return { formattedSql, mappedParams };
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const { formattedSql, mappedParams } = this.prepareSqlAndParams(sql, params);
    const stmt = this.db.prepare(formattedSql);
    const rows = stmt.all(...mappedParams) as T[];
    return rows;
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid?: number | bigint }> {
    const { formattedSql, mappedParams } = this.prepareSqlAndParams(sql, params);
    const stmt = this.db.prepare(formattedSql);
    const result = stmt.run(...mappedParams);
    return {
      changes: Number(result.changes),
      lastInsertRowid: result.lastInsertRowid
    };
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

class PostgresDatabase implements IDatabase {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const res = await this.pool.query(sql, params);
    return res.rows as T[];
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid?: number | bigint }> {
    const res = await this.pool.query(sql, params);
    return {
      changes: res.rowCount || 0
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

let dbInstance: IDatabase | null = null;

export function getDatabase(): IDatabase {
  if (dbInstance) return dbInstance;

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
    dbInstance = new PostgresDatabase(dbUrl);
    console.log('[Database] Connected to PostgreSQL via DATABASE_URL');
  } else {
    const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'grasshopper.db');
    dbInstance = new SQLiteDatabase(dbPath);
    console.log(`[Database] Using SQLite at ${dbPath}`);
  }

  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  const db = getDatabase();

  const schema = `
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS competitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      organizer TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      match_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      round TEXT NOT NULL,
      status TEXT NOT NULL,
      max_duration_seconds INTEGER NOT NULL,
      timer_start_time INTEGER,
      accumulated_active_ms INTEGER NOT NULL DEFAULT 0,
      pause_start_time INTEGER,
      total_pause_ms INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_teams (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      slot TEXT NOT NULL,
      team_name TEXT NOT NULL,
      color TEXT NOT NULL,
      is_finished INTEGER NOT NULL DEFAULT 0,
      finish_time_ms INTEGER,
      furthest_checkpoint INTEGER NOT NULL DEFAULT 0,
      furthest_checkpoint_time_ms INTEGER,
      status TEXT NOT NULL DEFAULT 'Belum Mulai',
      rank INTEGER,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      UNIQUE(match_id, slot)
    );

    CREATE TABLE IF NOT EXISTS checkpoint_records (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      checkpoint_number INTEGER NOT NULL,
      elapsed_time_ms INTEGER NOT NULL,
      recorded_at TEXT NOT NULL,
      recorded_by TEXT NOT NULL,
      is_corrected INTEGER NOT NULL DEFAULT 0,
      correction_reason TEXT,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES match_teams(id) ON DELETE CASCADE,
      UNIQUE(match_id, team_id, checkpoint_number)
    );

    CREATE TABLE IF NOT EXISTS match_events (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      elapsed_time_ms INTEGER NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      match_id TEXT,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `;

  // Execute schema creation statements
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await db.execute(statement);
  }

  // Migrate: add school_name column if not exists (safe for existing DBs)
  try {
    await db.execute(`ALTER TABLE match_teams ADD COLUMN school_name TEXT NOT NULL DEFAULT ''`);
    console.log('[Database] Migrated: added school_name column to match_teams');
  } catch {
    // Column already exists — safe to ignore
  }

  // Create indexes for fast lookup and integrity
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_matches_number ON matches(match_number);',
    'CREATE INDEX IF NOT EXISTS idx_match_teams_match ON match_teams(match_id);',
    'CREATE INDEX IF NOT EXISTS idx_checkpoints_match ON checkpoint_records(match_id);',
    'CREATE INDEX IF NOT EXISTS idx_audit_match ON audit_logs(match_id);'
  ];

  for (const idx of indexes) {
    try {
      await db.execute(idx);
    } catch {
      // index might already exist
    }
  }

  console.log('[Database] Schema and indexes initialized successfully.');
}
