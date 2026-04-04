import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  createEndpoint,
  getEndpointsBySession,
  getEndpointBySlug,
  getRequestLogsByEndpoint,
  getRequestLogById
} from '../database';

const router = Router();

// Generate a new unique URL
router.post('/generate-url', (req: Request, res: Response) => {
  try {
    const sessionId = (req as any).sessionId;
    const urlSlug = generateUniqueSlug();

    const endpoint = createEndpoint(sessionId, urlSlug);

    const baseUrl = process.env.BASE_URL || `http://localhost:3001`;
    const fullUrl = `${baseUrl}/e/${urlSlug}`;

    res.json({
      id: endpoint.id,
      url: fullUrl,
      slug: urlSlug,
      createdAt: endpoint.created_at
    });
  } catch (error) {
    console.error('Error generating URL:', error);
    res.status(500).json({ error: 'Failed to generate URL' });
  }
});

// Get all endpoints for current session
router.get('/endpoints', (req: Request, res: Response) => {
  try {
    const sessionId = (req as any).sessionId;
    const endpoints = getEndpointsBySession(sessionId);

    const baseUrl = process.env.BASE_URL || `http://localhost:3001`;

    const formattedEndpoints = endpoints.map(ep => ({
      id: ep.id,
      url: `${baseUrl}/e/${ep.url_slug}`,
      slug: ep.url_slug,
      createdAt: ep.created_at
    }));

    res.json(formattedEndpoints);
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    res.status(500).json({ error: 'Failed to fetch endpoints' });
  }
});

// Get request logs for an endpoint
router.get('/endpoints/:endpointId/logs', (req: Request, res: Response) => {
  try {
    const { endpointId } = req.params;
    const logs = getRequestLogsByEndpoint(endpointId);

    const formattedLogs = logs.map(log => ({
      id: log.id,
      method: log.method,
      headers: JSON.parse(log.headers),
      body: log.body,
      queryParams: log.query_params ? JSON.parse(log.query_params) : null,
      sourceIp: log.source_ip,
      geoLocation: log.geo_location ? JSON.parse(log.geo_location) : null,
      userAgent: log.user_agent,
      timestamp: log.timestamp
    }));

    res.json(formattedLogs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get a specific request log
router.get('/logs/:logId', (req: Request, res: Response) => {
  try {
    const { logId } = req.params;
    const log = getRequestLogById(logId);

    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    res.json({
      id: log.id,
      method: log.method,
      headers: JSON.parse(log.headers),
      body: log.body,
      queryParams: log.query_params ? JSON.parse(log.query_params) : null,
      sourceIp: log.source_ip,
      geoLocation: log.geo_location ? JSON.parse(log.geo_location) : null,
      userAgent: log.user_agent,
      timestamp: log.timestamp
    });
  } catch (error) {
    console.error('Error fetching log:', error);
    res.status(500).json({ error: 'Failed to fetch log' });
  }
});

function generateUniqueSlug(): string {
  return uuidv4().substring(0, 8);
}

export { router as apiRouter };
