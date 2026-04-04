import {
  initDatabase,
  createEndpoint,
  getEndpointsBySession,
  getEndpointBySlug,
  softDeleteEndpoint,
  createRequestLog,
  getRequestLogsByEndpoint,
  getRequestLogById,
} from '../../src/database-memory';

describe('Database Operations', () => {
  beforeEach(() => {
    initDatabase();
  });

  describe('Endpoints', () => {
    it('should create a new endpoint', () => {
      const sessionId = 'test-session-1';
      const urlSlug = 'test-slug-1';

      const endpoint = createEndpoint(sessionId, urlSlug);

      expect(endpoint).toHaveProperty('id');
      expect(endpoint.session_id).toBe(sessionId);
      expect(endpoint.url_slug).toBe(urlSlug);
      expect(endpoint.created_at).toBeGreaterThan(0);
    });

    it('should retrieve endpoints by session', () => {
      const sessionId = 'test-session-2';

      createEndpoint(sessionId, 'slug-1');
      createEndpoint(sessionId, 'slug-2');
      createEndpoint('other-session', 'slug-3');

      const endpoints = getEndpointsBySession(sessionId);

      expect(endpoints).toHaveLength(2);
      expect(endpoints.every((e) => e.session_id === sessionId)).toBe(true);
    });

    it('should retrieve endpoint by slug', () => {
      const urlSlug = 'unique-slug';
      const created = createEndpoint('session-3', urlSlug);

      const found = getEndpointBySlug(urlSlug);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.url_slug).toBe(urlSlug);
    });

    it('should return undefined for non-existent slug', () => {
      const found = getEndpointBySlug('non-existent-slug');
      expect(found).toBeUndefined();
    });

    it('should enforce unique url_slug constraint', () => {
      const slug = 'duplicate-slug';
      createEndpoint('session-1', slug);

      expect(() => {
        createEndpoint('session-2', slug);
      }).toThrow();
    });
  });

  describe('softDeleteEndpoint', () => {
    it('should soft-delete an endpoint and return true', () => {
      const sessionId = 'session-soft-delete-1';
      const endpoint = createEndpoint(sessionId, 'soft-delete-slug-1');

      const result = softDeleteEndpoint(endpoint.id, sessionId);

      expect(result).toBe(true);
    });

    it('should set deleted_at on the endpoint', () => {
      const before = Date.now();
      const sessionId = 'session-soft-delete-2';
      const endpoint = createEndpoint(sessionId, 'soft-delete-slug-2');

      softDeleteEndpoint(endpoint.id, sessionId);

      // getEndpointBySlug still finds the row (URL slug remains resolvable)
      const found = getEndpointBySlug('soft-delete-slug-2');
      expect(found).toBeDefined();
      expect(found!.deleted_at).toBeGreaterThanOrEqual(before);
    });

    it('should return false for a non-existent endpoint', () => {
      const result = softDeleteEndpoint('non-existent-id', 'any-session');
      expect(result).toBe(false);
    });

    it('should return false when the endpoint belongs to a different session', () => {
      const endpoint = createEndpoint('session-owner', 'owned-slug');

      const result = softDeleteEndpoint(endpoint.id, 'session-attacker');

      expect(result).toBe(false);
      // Endpoint should be untouched
      const found = getEndpointBySlug('owned-slug');
      expect(found!.deleted_at).toBeNull();
    });

    it('should return false when the endpoint is already deleted', () => {
      const sessionId = 'session-double-delete';
      const endpoint = createEndpoint(sessionId, 'double-delete-slug');

      softDeleteEndpoint(endpoint.id, sessionId);
      const result = softDeleteEndpoint(endpoint.id, sessionId);

      expect(result).toBe(false);
    });

    it('should exclude soft-deleted endpoints from getEndpointsBySession', () => {
      const sessionId = 'session-filter-test';
      const ep1 = createEndpoint(sessionId, 'filter-slug-1');
      const ep2 = createEndpoint(sessionId, 'filter-slug-2');

      softDeleteEndpoint(ep1.id, sessionId);

      const endpoints = getEndpointsBySession(sessionId);
      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].id).toBe(ep2.id);
    });

    it('should still resolve slug via getEndpointBySlug after soft-delete', () => {
      const sessionId = 'session-slug-resolve';
      const endpoint = createEndpoint(sessionId, 'still-resolves-slug');

      softDeleteEndpoint(endpoint.id, sessionId);

      const found = getEndpointBySlug('still-resolves-slug');
      expect(found).toBeDefined();
      expect(found!.id).toBe(endpoint.id);
    });

    it('should preserve all request logs after soft-delete', () => {
      const sessionId = 'session-preserve-logs';
      const endpoint = createEndpoint(sessionId, 'preserve-logs-slug');

      createRequestLog({
        endpoint_id: endpoint.id,
        method: 'GET',
        headers: '{}',
        body: null,
        query_params: null,
        source_ip: '1.1.1.1',
        geo_location: null,
        user_agent: null,
        timestamp: Date.now(),
      });

      softDeleteEndpoint(endpoint.id, sessionId);

      const logs = getRequestLogsByEndpoint(endpoint.id);
      expect(logs).toHaveLength(1);
      expect(logs[0].method).toBe('GET');
    });
  });

  describe('Request Logs', () => {
    let testEndpoint: any;

    beforeEach(() => {
      testEndpoint = createEndpoint('log-session', 'log-slug-' + Date.now());
    });

    it('should create a request log', () => {
      const log = createRequestLog({
        endpoint_id: testEndpoint.id,
        method: 'POST',
        headers: JSON.stringify({ 'content-type': 'application/json' }),
        body: '{"test": true}',
        query_params: JSON.stringify({ foo: 'bar' }),
        source_ip: '192.168.1.1',
        geo_location: JSON.stringify({ country: 'US', city: 'New York' }),
        user_agent: 'Mozilla/5.0',
        timestamp: Date.now(),
      });

      expect(log).toHaveProperty('id');
      expect(log.endpoint_id).toBe(testEndpoint.id);
      expect(log.method).toBe('POST');
      expect(log.source_ip).toBe('192.168.1.1');
    });

    it('should retrieve logs by endpoint', () => {
      const endpoint1 = createEndpoint('session-logs', 'endpoint-1-' + Date.now());
      const endpoint2 = createEndpoint('session-logs', 'endpoint-2-' + Date.now());

      // Create logs for endpoint1
      createRequestLog({
        endpoint_id: endpoint1.id,
        method: 'GET',
        headers: '{}',
        body: null,
        query_params: null,
        source_ip: '1.1.1.1',
        geo_location: null,
        user_agent: null,
        timestamp: Date.now(),
      });

      createRequestLog({
        endpoint_id: endpoint1.id,
        method: 'POST',
        headers: '{}',
        body: 'test',
        query_params: null,
        source_ip: '2.2.2.2',
        geo_location: null,
        user_agent: null,
        timestamp: Date.now() + 1000,
      });

      // Create log for endpoint2
      createRequestLog({
        endpoint_id: endpoint2.id,
        method: 'DELETE',
        headers: '{}',
        body: null,
        query_params: null,
        source_ip: '3.3.3.3',
        geo_location: null,
        user_agent: null,
        timestamp: Date.now(),
      });

      const logs = getRequestLogsByEndpoint(endpoint1.id);

      expect(logs).toHaveLength(2);
      expect(logs.every((l) => l.endpoint_id === endpoint1.id)).toBe(true);
      // Should be sorted by timestamp DESC
      expect(logs[0].method).toBe('POST');
      expect(logs[1].method).toBe('GET');
    });

    it('should retrieve specific log by id', () => {
      const created = createRequestLog({
        endpoint_id: testEndpoint.id,
        method: 'PUT',
        headers: '{}',
        body: 'test body',
        query_params: null,
        source_ip: '4.4.4.4',
        geo_location: null,
        user_agent: 'Test Agent',
        timestamp: Date.now(),
      });

      const found = getRequestLogById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.method).toBe('PUT');
      expect(found?.user_agent).toBe('Test Agent');
    });

    it('should return undefined for non-existent log', () => {
      const found = getRequestLogById('non-existent-id');
      expect(found).toBeUndefined();
    });

    it('should handle null values correctly', () => {
      const log = createRequestLog({
        endpoint_id: testEndpoint.id,
        method: 'GET',
        headers: '{}',
        body: null,
        query_params: null,
        source_ip: '5.5.5.5',
        geo_location: null,
        user_agent: null,
        timestamp: Date.now(),
      });

      expect(log.body).toBeNull();
      expect(log.query_params).toBeNull();
      expect(log.geo_location).toBeNull();
      expect(log.user_agent).toBeNull();
    });
  });
});
