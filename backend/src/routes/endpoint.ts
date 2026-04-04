import { Router, Request, Response } from 'express';
import getRawBody from 'raw-body';
import geoip from 'geoip-lite';
import { getEndpointBySlug, createRequestLog } from '../database';
import { broadcastNewRequest } from '../websocket';

const router = Router();

// Handle all methods on generated endpoints
router.all('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    // Find the endpoint
    const endpoint = getEndpointBySlug(slug);

    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    // Get raw body for non-JSON content types
    let body = '';
    if (req.body && Object.keys(req.body).length > 0) {
      body = JSON.stringify(req.body);
    } else if (req.readable) {
      try {
        const rawBody = await getRawBody(req, {
          length: req.headers['content-length'],
          limit: '10mb',
          encoding: 'utf8'
        });
        body = rawBody.toString();
      } catch (error) {
        console.error('Error reading raw body:', error);
      }
    }

    // Get client IP
    const sourceIp = getClientIp(req);

    // Get geolocation
    const geo = geoip.lookup(sourceIp);
    const geoLocation = geo ? {
      country: geo.country,
      region: geo.region,
      city: geo.city,
      timezone: geo.timezone,
      coordinates: geo.ll
    } : null;

    // Create request log
    const log = createRequestLog({
      endpoint_id: endpoint.id,
      method: req.method,
      headers: JSON.stringify(req.headers),
      body: body || null,
      query_params: JSON.stringify(req.query),
      source_ip: sourceIp,
      geo_location: geoLocation ? JSON.stringify(geoLocation) : null,
      user_agent: req.headers['user-agent'] || null,
      timestamp: Date.now()
    });

    // Broadcast to WebSocket clients
    broadcastNewRequest(endpoint.id, {
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

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Request logged successfully',
      timestamp: log.timestamp
    });

  } catch (error) {
    console.error('Error handling endpoint request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

export { router as endpointRouter };
