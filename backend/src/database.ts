import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../data/analyser.db'));

export interface Endpoint {
  id: string;
  session_id: string;
  url_slug: string;
  created_at: number;
}

export interface RequestLog {
  id: string;
  endpoint_id: string;
  method: string;
  headers: string;
  body: string | null;
  query_params: string | null;
  source_ip: string;
  geo_location: string | null;
  user_agent: string | null;
  timestamp: number;
}

export function initDatabase() {
  // Create endpoints table
  db.exec(`
    CREATE TABLE IF NOT EXISTS endpoints (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      url_slug TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Create request_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS request_logs (
      id TEXT PRIMARY KEY,
      endpoint_id TEXT NOT NULL,
      method TEXT NOT NULL,
      headers TEXT NOT NULL,
      body TEXT,
      query_params TEXT,
      source_ip TEXT,
      geo_location TEXT,
      user_agent TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (endpoint_id) REFERENCES endpoints (id)
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_endpoints_session ON endpoints(session_id);
    CREATE INDEX IF NOT EXISTS idx_endpoints_slug ON endpoints(url_slug);
    CREATE INDEX IF NOT EXISTS idx_logs_endpoint ON request_logs(endpoint_id);
    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON request_logs(timestamp);
  `);

  console.log('Database initialized');
}

export function createEndpoint(sessionId: string, urlSlug: string): Endpoint {
  const id = require('uuid').v4();
  const createdAt = Date.now();

  const stmt = db.prepare(`
    INSERT INTO endpoints (id, session_id, url_slug, created_at)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(id, sessionId, urlSlug, createdAt);

  return { id, session_id: sessionId, url_slug: urlSlug, created_at: createdAt };
}

export function getEndpointsBySession(sessionId: string): Endpoint[] {
  const stmt = db.prepare(`
    SELECT * FROM endpoints WHERE session_id = ? ORDER BY created_at DESC
  `);

  return stmt.all(sessionId) as Endpoint[];
}

export function getEndpointBySlug(urlSlug: string): Endpoint | undefined {
  const stmt = db.prepare(`
    SELECT * FROM endpoints WHERE url_slug = ?
  `);

  return stmt.get(urlSlug) as Endpoint | undefined;
}

export function createRequestLog(log: Omit<RequestLog, 'id'>): RequestLog {
  const id = require('uuid').v4();

  const stmt = db.prepare(`
    INSERT INTO request_logs (
      id, endpoint_id, method, headers, body, query_params,
      source_ip, geo_location, user_agent, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    log.endpoint_id,
    log.method,
    log.headers,
    log.body,
    log.query_params,
    log.source_ip,
    log.geo_location,
    log.user_agent,
    log.timestamp
  );

  return { id, ...log };
}

export function getRequestLogsByEndpoint(endpointId: string): RequestLog[] {
  const stmt = db.prepare(`
    SELECT * FROM request_logs WHERE endpoint_id = ? ORDER BY timestamp DESC
  `);

  return stmt.all(endpointId) as RequestLog[];
}

export function getRequestLogById(id: string): RequestLog | undefined {
  const stmt = db.prepare(`
    SELECT * FROM request_logs WHERE id = ?
  `);

  return stmt.get(id) as RequestLog | undefined;
}

export { db };
