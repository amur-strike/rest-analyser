import type { Endpoint, RequestLog } from '../types';

export const mockEndpoint: Endpoint = {
  id: 'endpoint-1',
  url: 'http://localhost:3001/e/abc123',
  slug: 'abc123',
  createdAt: Date.now(),
};

export const mockEndpoints: Endpoint[] = [
  {
    id: 'endpoint-1',
    url: 'http://localhost:3001/e/abc123',
    slug: 'abc123',
    createdAt: Date.now() - 1000,
  },
  {
    id: 'endpoint-2',
    url: 'http://localhost:3001/e/def456',
    slug: 'def456',
    createdAt: Date.now() - 2000,
  },
];

export const mockRequestLog: RequestLog = {
  id: 'log-1',
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'user-agent': 'Mozilla/5.0',
  },
  body: '{"message": "Hello World"}',
  queryParams: { foo: 'bar' },
  sourceIp: '192.168.1.1',
  geoLocation: {
    country: 'US',
    region: 'CA',
    city: 'San Francisco',
    timezone: 'America/Los_Angeles',
    coordinates: [37.7749, -122.4194],
  },
  userAgent: 'Mozilla/5.0',
  timestamp: Date.now(),
};

export const mockRequestLogs: RequestLog[] = [
  {
    id: 'log-1',
    method: 'GET',
    headers: { 'user-agent': 'curl/7.68.0' },
    body: null,
    queryParams: { test: '1' },
    sourceIp: '1.2.3.4',
    geoLocation: null,
    userAgent: 'curl/7.68.0',
    timestamp: Date.now(),
  },
  {
    id: 'log-2',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"data": "test"}',
    queryParams: null,
    sourceIp: '5.6.7.8',
    geoLocation: {
      country: 'US',
      region: 'NY',
      city: 'New York',
      timezone: 'America/New_York',
      coordinates: [40.7128, -74.006],
    },
    userAgent: 'PostmanRuntime/7.32.3',
    timestamp: Date.now() - 1000,
  },
];
