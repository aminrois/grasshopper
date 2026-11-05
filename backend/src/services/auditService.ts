import { getDatabase } from '../db/database.js';
import { AuditLog } from '../types/index.js';
import crypto from 'node:crypto';

export async function logAudit(
  matchId: string | null,
  action: string,
  details: string,
  performedBy: string = 'Juri Operator'
): Promise<AuditLog> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  await db.execute(
    `INSERT INTO audit_logs (id, match_id, action, details, performed_by, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, matchId, action, details, performedBy, timestamp]
  );

  return {
    id,
    match_id: matchId,
    action,
    details,
    performed_by: performedBy,
    timestamp
  };
}

export async function getRecentAuditLogs(matchId?: string, limit: number = 10): Promise<AuditLog[]> {
  const db = getDatabase();
  let sql = 'SELECT * FROM audit_logs';
  const params: any[] = [];

  if (matchId) {
    sql += ' WHERE match_id = $1';
    params.push(matchId);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ' + limit;
  return db.query<AuditLog>(sql, params);
}

