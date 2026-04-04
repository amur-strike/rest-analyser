import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('API Service', () => {
  // Mock axios before importing api
  const mockPost = vi.fn();
  const mockGet = vi.fn();
  const mockDelete = vi.fn();

  vi.doMock('axios', () => ({
    default: {
      create: vi.fn(() => ({
        post: mockPost,
        get: mockGet,
        delete: mockDelete,
      })),
    },
  }));

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe('generateUrl', () => {
    it('should generate a new URL', async () => {
      const mockResponse = {
        data: {
          id: 'endpoint-1',
          url: 'http://localhost:3001/e/abc123',
          slug: 'abc123',
          createdAt: Date.now(),
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      // Import after mocking
      const { api } = await import('../api');
      const result = await api.generateUrl();

      expect(mockPost).toHaveBeenCalledWith('/api/generate-url');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getEndpoints', () => {
    it('should fetch endpoints', async () => {
      const mockResponse = {
        data: [
          {
            id: 'endpoint-1',
            url: 'http://localhost:3001/e/abc123',
            slug: 'abc123',
            createdAt: Date.now(),
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const { api } = await import('../api');
      const result = await api.getEndpoints();

      expect(mockGet).toHaveBeenCalledWith('/api/endpoints');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getRequestLogs', () => {
    it('should fetch request logs for an endpoint', async () => {
      const mockResponse = {
        data: [
          {
            id: 'log-1',
            method: 'POST',
            headers: {},
            body: 'test',
            timestamp: Date.now(),
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const { api } = await import('../api');
      const result = await api.getRequestLogs('endpoint-1');

      expect(mockGet).toHaveBeenCalledWith('/api/endpoints/endpoint-1/logs');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getRequestLog', () => {
    it('should fetch a specific request log', async () => {
      const mockResponse = {
        data: {
          id: 'log-1',
          method: 'GET',
          headers: {},
          timestamp: Date.now(),
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const { api } = await import('../api');
      const result = await api.getRequestLog('log-1');

      expect(mockGet).toHaveBeenCalledWith('/api/logs/log-1');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('deleteEndpoint', () => {
    it('should send a DELETE request to the correct URL', async () => {
      mockDelete.mockResolvedValue({ data: undefined });

      const { api } = await import('../api');
      await api.deleteEndpoint('endpoint-1');

      expect(mockDelete).toHaveBeenCalledWith('/api/endpoints/endpoint-1');
    });

    it('should resolve without a return value on success', async () => {
      mockDelete.mockResolvedValue({ data: undefined });

      const { api } = await import('../api');
      const result = await api.deleteEndpoint('endpoint-1');

      expect(result).toBeUndefined();
    });
  });
});
