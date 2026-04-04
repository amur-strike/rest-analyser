import request from 'supertest';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { apiRouter } from '../../src/routes/api';
import { endpointRouter } from '../../src/routes/endpoint';
import { initDatabase } from '../../src/database-memory';

// Mock the database module
jest.mock('../../src/database', () => require('../../src/database-memory'));

// Mock the websocket module — no WS server in tests; we just verify calls
jest.mock('../../src/websocket', () => ({
  broadcastNewRequest: jest.fn(),
  notifyEndpointDeleted: jest.fn(),
}));

import { notifyEndpointDeleted } from '../../src/websocket';

describe('API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(cors({ credentials: true }));
    app.use(cookieParser());
    app.use(express.json());

    // Session middleware
    app.use((req, res, next) => {
      let sessionId = req.cookies.sessionId;
      if (!sessionId) {
        sessionId = 'test-session-' + Date.now();
        res.cookie('sessionId', sessionId, { httpOnly: true });
      }
      (req as any).sessionId = sessionId;
      next();
    });

    app.use('/api', apiRouter);
    app.use('/e', endpointRouter);
  });

  beforeEach(() => {
    initDatabase();
  });

  describe('POST /api/generate-url', () => {
    it('should generate a new URL', async () => {
      const response = await request(app)
        .post('/api/generate-url')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('slug');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body.url).toContain(response.body.slug);
    });

    it('should set session cookie', async () => {
      const response = await request(app)
        .post('/api/generate-url')
        .expect(200);

      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('GET /api/endpoints', () => {
    it('should return empty array for new session', async () => {
      const response = await request(app)
        .get('/api/endpoints')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return endpoints for session', async () => {
      const agent = request.agent(app);

      // Generate two URLs
      await agent.post('/api/generate-url');
      await agent.post('/api/generate-url');

      // Get endpoints
      const response = await agent.get('/api/endpoints').expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('url');
      expect(response.body[0]).toHaveProperty('slug');
    });
  });

  describe('DELETE /api/endpoints/:endpointId', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should soft-delete an endpoint and return 204', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const { id: endpointId } = urlResponse.body;

      await agent.delete(`/api/endpoints/${endpointId}`).expect(204);
    });

    it('should remove the endpoint from GET /api/endpoints after deletion', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const { id: endpointId } = urlResponse.body;

      await agent.delete(`/api/endpoints/${endpointId}`);

      const listResponse = await agent.get('/api/endpoints').expect(200);
      const ids = listResponse.body.map((e: any) => e.id);
      expect(ids).not.toContain(endpointId);
    });

    it('should return 404 for a non-existent endpoint', async () => {
      const agent = request.agent(app);

      await agent.delete('/api/endpoints/non-existent-id').expect(404);
    });

    it('should return 404 when trying to delete another session\'s endpoint', async () => {
      // Create endpoint with agent1
      const agent1 = request.agent(app);
      const urlResponse = await agent1.post('/api/generate-url');
      const { id: endpointId } = urlResponse.body;

      // Try to delete with agent2 (different session)
      const agent2 = request.agent(app);
      await agent2.delete(`/api/endpoints/${endpointId}`).expect(404);

      // Endpoint should still exist for agent1
      const listResponse = await agent1.get('/api/endpoints').expect(200);
      expect(listResponse.body.map((e: any) => e.id)).toContain(endpointId);
    });

    it('should return 404 when deleting an already-deleted endpoint', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const { id: endpointId } = urlResponse.body;

      await agent.delete(`/api/endpoints/${endpointId}`).expect(204);
      await agent.delete(`/api/endpoints/${endpointId}`).expect(404);
    });

    it('should still capture new requests to the slug after deletion', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const { id: endpointId, slug } = urlResponse.body;

      await agent.delete(`/api/endpoints/${endpointId}`);

      // The URL slug should still accept incoming requests
      const response = await agent.get(`/e/${slug}`).expect(200);
      expect(response.body.success).toBe(true);
    });

    it('should preserve existing request logs after deletion', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const { id: endpointId, slug } = urlResponse.body;

      // Log a request before deletion
      await agent.post(`/e/${slug}`).send({ data: 'before delete' });

      await agent.delete(`/api/endpoints/${endpointId}`);

      // Logs should still be accessible
      const logsResponse = await agent.get(`/api/endpoints/${endpointId}/logs`).expect(200);
      expect(logsResponse.body).toHaveLength(1);
      expect(logsResponse.body[0].method).toBe('POST');
    });

    it('should call notifyEndpointDeleted with the correct endpoint ID', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const { id: endpointId } = urlResponse.body;

      await agent.delete(`/api/endpoints/${endpointId}`).expect(204);

      expect(notifyEndpointDeleted).toHaveBeenCalledWith(endpointId);
    });

    it('should not call notifyEndpointDeleted when deletion fails', async () => {
      const agent = request.agent(app);

      await agent.delete('/api/endpoints/non-existent-id').expect(404);

      expect(notifyEndpointDeleted).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/endpoints/:endpointId/logs', () => {
    it('should return empty array for new endpoint', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const endpointId = urlResponse.body.id;

      const response = await agent
        .get(`/api/endpoints/${endpointId}/logs`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should return logs after requests to endpoint', async () => {
      const agent = request.agent(app);

      // Generate URL
      const urlResponse = await agent.post('/api/generate-url');
      const { slug, id: endpointId } = urlResponse.body;

      // Send request to endpoint
      await agent
        .post(`/e/${slug}`)
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      // Get logs
      const response = await agent
        .get(`/api/endpoints/${endpointId}/logs`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0].method).toBe('POST');
      expect(response.body[0].body).toContain('test');
    });
  });

  describe('GET /api/logs/:logId', () => {
    it('should return 404 for non-existent log', async () => {
      await request(app)
        .get('/api/logs/non-existent-id')
        .expect(404);
    });

    it('should return specific log', async () => {
      const agent = request.agent(app);

      // Generate URL and send request
      const urlResponse = await agent.post('/api/generate-url');
      const { slug, id: endpointId } = urlResponse.body;

      await agent.post(`/e/${slug}`).send({ data: 'test' });

      // Get logs to get the log ID
      const logsResponse = await agent.get(`/api/endpoints/${endpointId}/logs`);
      const logId = logsResponse.body[0].id;

      // Get specific log
      const response = await agent.get(`/api/logs/${logId}`).expect(200);

      expect(response.body.id).toBe(logId);
      expect(response.body.method).toBe('POST');
    });
  });

  describe('Dynamic Endpoint /e/:slug', () => {
    it('should handle GET request', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const { slug } = urlResponse.body;

      const response = await agent
        .get(`/e/${slug}?foo=bar&test=123`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });

    it('should handle POST request with body', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const { slug } = urlResponse.body;

      const response = await agent
        .post(`/e/${slug}`)
        .send({ message: 'Hello', count: 42 })
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle PUT request', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const { slug } = urlResponse.body;

      await agent.put(`/e/${slug}`).send({ update: true }).expect(200);
    });

    it('should handle DELETE request', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const { slug } = urlResponse.body;

      await agent.delete(`/e/${slug}`).expect(200);
    });

    it('should return 404 for non-existent endpoint', async () => {
      await request(app).get('/e/non-existent-slug').expect(404);
    });

    it('should capture headers correctly', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const { slug, id: endpointId } = urlResponse.body;

      await agent
        .post(`/e/${slug}`)
        .set('X-Custom-Header', 'test-value')
        .set('User-Agent', 'Test Agent/1.0')
        .send({ data: 'test' });

      const logsResponse = await agent.get(`/api/endpoints/${endpointId}/logs`);
      const log = logsResponse.body[0];

      expect(log.headers).toHaveProperty('x-custom-header');
      expect(log.headers['x-custom-header']).toBe('test-value');
      expect(log.userAgent).toBe('Test Agent/1.0');
    });

    it('should capture query parameters', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const { slug, id: endpointId } = urlResponse.body;

      await agent.get(`/e/${slug}?param1=value1&param2=value2`);

      const logsResponse = await agent.get(`/api/endpoints/${endpointId}/logs`);
      const log = logsResponse.body[0];

      expect(log.queryParams).toHaveProperty('param1');
      expect(log.queryParams.param1).toBe('value1');
      expect(log.queryParams.param2).toBe('value2');
    });

    it('should capture request body', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const { slug, id: endpointId } = urlResponse.body;

      const testBody = { message: 'Hello World', number: 123, nested: { key: 'value' } };

      await agent.post(`/e/${slug}`).send(testBody);

      const logsResponse = await agent.get(`/api/endpoints/${endpointId}/logs`);
      const log = logsResponse.body[0];

      expect(log.body).toBeTruthy();
      const parsedBody = JSON.parse(log.body);
      expect(parsedBody).toEqual(testBody);
    });

    it('should record multiple requests in order', async () => {
      const agent = request.agent(app);

      const urlResponse = await agent.post('/api/generate-url');
      const { slug, id: endpointId } = urlResponse.body;

      // Send multiple requests
      await agent.get(`/e/${slug}`);
      await new Promise(resolve => setTimeout(resolve, 10));
      await agent.post(`/e/${slug}`).send({ request: 2 });
      await new Promise(resolve => setTimeout(resolve, 10));
      await agent.put(`/e/${slug}`).send({ request: 3 });

      const logsResponse = await agent.get(`/api/endpoints/${endpointId}/logs`);

      expect(logsResponse.body).toHaveLength(3);
      // Should be in reverse chronological order
      expect(logsResponse.body[0].method).toBe('PUT');
      expect(logsResponse.body[1].method).toBe('POST');
      expect(logsResponse.body[2].method).toBe('GET');
    });
  });
});
