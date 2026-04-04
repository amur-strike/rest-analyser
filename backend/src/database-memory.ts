// In-memory database implementation for testing
import { v4 as uuidv4 } from 'uuid';

export interface Endpoint {
  id: string;
  session_id: string;
  url_slug: string;
  created_at: number;
  deleted_at: number | null;
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

// In-memory storage
let endpoints: Endpoint[] = [];
let requestLogs: RequestLog[] = [];

export function initDatabase() {
  endpoints = [];
  requestLogs = [];
  console.log('In-memory database initialized');
}

export function createEndpoint(sessionId: string, urlSlug: string): Endpoint {
  // Check for duplicate slug
  if (endpoints.some(e => e.url_slug === urlSlug)) {
    throw new Error('UNIQUE constraint failed: endpoints.url_slug');
  }

  const endpoint: Endpoint = {
    id: uuidv4(),
    session_id: sessionId,
    url_slug: urlSlug,
    created_at: Date.now(),
    deleted_at: null,
  };

  endpoints.push(endpoint);
  return endpoint;
}

export function getEndpointsBySession(sessionId: string): Endpoint[] {
  return endpoints
    .filter(e => e.session_id === sessionId && e.deleted_at === null)
    .sort((a, b) => b.created_at - a.created_at);
}

export function softDeleteEndpoint(endpointId: string, sessionId: string): boolean {
  const endpoint = endpoints.find(
    e => e.id === endpointId && e.session_id === sessionId && e.deleted_at === null
  );
  if (!endpoint) return false;
  endpoint.deleted_at = Date.now();
  return true;
}

export function getEndpointBySlug(urlSlug: string): Endpoint | undefined {
  return endpoints.find(e => e.url_slug === urlSlug);
}

export function createRequestLog(log: Omit<RequestLog, 'id'>): RequestLog {
  const requestLog: RequestLog = {
    id: uuidv4(),
    ...log,
  };

  requestLogs.push(requestLog);
  return requestLog;
}

export function getRequestLogsByEndpoint(endpointId: string): RequestLog[] {
  return requestLogs
    .filter(l => l.endpoint_id === endpointId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function getRequestLogById(id: string): RequestLog | undefined {
  return requestLogs.find(l => l.id === id);
}

export const db = {
  close: () => {
    // No-op for in-memory
  },
};
