# Project Structure

Complete REST Endpoint Analyser application with AWS deployment infrastructure.

## Directory Structure

```
rest-analyser/
├── backend/                    # Node.js Backend
│   ├── src/
│   │   ├── server.ts          # Express server with WebSocket
│   │   ├── database.ts        # SQLite database operations
│   │   ├── websocket.ts       # WebSocket server
│   │   └── routes/
│   │       ├── api.ts         # API endpoints
│   │       └── endpoint.ts    # Dynamic endpoint handler
│   ├── Dockerfile             # Production Docker image
│   ├── .dockerignore
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx     # Header with generate button
│   │   │   ├── Header.css
│   │   │   ├── EndpointList.tsx    # Sidebar with endpoints
│   │   │   ├── EndpointList.css
│   │   │   ├── RequestViewer.tsx   # Request details viewer
│   │   │   └── RequestViewer.css
│   │   ├── __tests__/
│   │   │   └── App.test.tsx        # App integration tests (real-time update regression)
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts     # WebSocket hook with auto-reconnect & onConnected callback
│   │   ├── services/
│   │   │   └── api.ts         # API client
│   │   ├── types/
│   │   │   └── index.ts       # TypeScript types
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── cdk/                        # AWS CDK Infrastructure
│   ├── bin/
│   │   └── rest-analyser.ts   # CDK app entry point
│   ├── lib/
│   │   ├── rest-analyser-stack.ts           # Main ECS Fargate stack
│   │   └── rest-analyser-stack-app-runner.ts # Alternative App Runner stack
│   ├── cdk.json
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md              # Detailed CDK documentation
│
├── scripts/
│   ├── build-frontend.sh      # Build frontend script
│   ├── deploy.sh              # Full deployment script
│   └── local-docker.sh        # Local Docker test script
│
├── README.md                   # Main documentation
├── AWS_DEPLOYMENT.md          # AWS deployment guide
├── PROJECT_STRUCTURE.md       # This file
├── package.json               # Root package.json
└── .gitignore

```

## Key Files Explained

### Backend

**server.ts**
- Express server setup
- WebSocket integration
- Session management with cookies
- Health check endpoint

**database.ts**
- SQLite database initialization
- CRUD operations for endpoints and request logs
- Database schema management

**routes/api.ts**
- POST /api/generate-url - Generate new monitoring URL
- GET /api/endpoints - Get all endpoints for session (excludes soft-deleted)
- DELETE /api/endpoints/:id - Soft-delete an endpoint; notifies subscribed WebSocket clients
- GET /api/endpoints/:id/logs - Get request logs (preserved after deletion)
- GET /api/logs/:logId - Get specific log

**routes/endpoint.ts**
- ALL /e/:slug - Capture all HTTP methods
- Log request details (headers, body, IP, geolocation)
- Broadcast via WebSocket

**websocket.ts**
- WebSocket server setup
- Subscribe/unsubscribe to endpoints
- Real-time request broadcasting (`broadcastNewRequest`)
- Endpoint deletion notification (`notifyEndpointDeleted`) — sends `endpoint_deleted` to all subscribed clients and clears their subscription server-side

### Frontend

**App.tsx**
- Main application component
- State management for endpoints and requests
- WebSocket connection management

**components/Header.tsx**
- Application header
- Generate URL button

**components/EndpointList.tsx**
- Sidebar displaying all endpoints
- Endpoint selection
- Copy URL functionality
- Delete endpoint button (calls `onDeleteEndpoint` prop, stops propagation to selection)

**components/RequestViewer.tsx**
- Request history list
- Detailed request information
- Method color coding

**hooks/useWebSocket.ts**
- WebSocket connection with auto-reconnect (3 s delay)
- Callbacks (`onMessage`, `onConnected`) stored in refs — prevents reconnect loop caused by stale closure references
- `onConnected` fires on every successful open (initial and after reconnect) — callers use it to re-send subscribe messages
- `sendMessage` is a no-op when the socket is not yet `OPEN`
- `connect()` returns its own cleanup closure with a per-connection `intentionallyClosed` flag; the effect simply calls the returned cleanup — this correctly guards against React StrictMode's async `onclose` firing after the remount's `connect()` would have reset any shared flag, which previously created a duplicate live connection that caused every broadcast to be delivered twice

**services/api.ts**
- Axios-based API client
- All API calls centralized
- Credentials support for cookies

### AWS CDK

**lib/rest-analyser-stack.ts** (Main Stack)
Infrastructure components:
1. **VPC**: 2 AZs, single NAT Gateway
2. **EFS**: Persistent storage for SQLite
3. **ECS Cluster**: Fargate-based
4. **Task Definition**: 0.25 vCPU, 0.5GB RAM
5. **Application Load Balancer**: WebSocket support
6. **Auto-scaling**: 1-4 tasks based on CPU/memory
7. **S3 + CloudFront**: Frontend hosting
8. **Optional**: Custom domain with Route53

**lib/rest-analyser-stack-app-runner.ts** (Alternative)
Simpler architecture:
1. **App Runner**: Managed container service
2. **ECR**: Container registry
3. **S3 + CloudFront**: Frontend hosting
4. **Note**: Requires cloud database (no EFS)

### Docker

**backend/Dockerfile**
- Multi-stage build (builder + production)
- Alpine Linux for minimal size
- Non-root user for security
- Health check included
- Production optimized

### Scripts

**scripts/deploy.sh**
- Complete deployment pipeline
- Builds frontend
- Deploys CDK stack

**scripts/local-docker.sh**
- Local Docker testing
- Mounts data directory
- Development configuration

**scripts/build-frontend.sh**
- Frontend build automation
- Production build

## Technology Stack

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: CSS Modules
- **HTTP Client**: Axios
- **Real-time**: WebSocket

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite with better-sqlite3
- **Real-time**: ws (WebSocket library)
- **Geolocation**: geoip-lite
- **Session**: cookie-parser

### Infrastructure (AWS)
- **Container**: Docker
- **Compute**: ECS Fargate
- **Storage**: EFS (Elastic File System)
- **Database**: SQLite on EFS
- **Load Balancer**: Application Load Balancer
- **CDN**: CloudFront
- **Static Hosting**: S3
- **DNS**: Route53 (optional)
- **SSL**: Certificate Manager
- **IaC**: AWS CDK with TypeScript

## Cost Optimization Features

1. **Minimal Fargate Resources**: 0.25 vCPU, 0.5GB RAM
2. **Single NAT Gateway**: Not HA but 50% cheaper
3. **EFS Lifecycle Policy**: Move to IA after 30 days
4. **CloudFront Price Class**: North America and Europe only
5. **Conservative Auto-scaling**: Max 4 tasks
6. **Short Log Retention**: 7 days
7. **Container Insights**: Disabled (enable for production)
8. **S3 Static Hosting**: Instead of additional compute

## Security Features

1. **VPC Isolation**: Private subnets for ECS
2. **EFS Encryption**: At rest and in transit
3. **IAM Roles**: Least privilege access
4. **HTTPS**: CloudFront with SSL/TLS
5. **S3 Block Public Access**: Enabled
6. **Container Security**: Non-root user
7. **Session Management**: HTTP-only cookies
8. **Health Checks**: Container and ALB level

## Development Workflow

1. **Local Development**:
   ```bash
   npm run dev
   ```

2. **Docker Testing**:
   ```bash
   npm run docker:local
   ```

3. **AWS Deployment**:
   ```bash
   npm run cdk:deploy
   ```

4. **Cleanup**:
   ```bash
   npm run cdk:destroy
   ```

## API Endpoints

### Management API
- `POST /api/generate-url` - Generate new endpoint
- `GET /api/endpoints` - List user's endpoints (excludes soft-deleted)
- `DELETE /api/endpoints/:id` - Soft-delete endpoint (preserves logs and URL slug)
- `GET /api/endpoints/:id/logs` - Get request logs (accessible even after deletion)
- `GET /api/logs/:logId` - Get specific log

### Dynamic Endpoints
- `ALL /e/:slug` - User's generated endpoints

### Health
- `GET /health` - Health check

## WebSocket Protocol

### Client → Server
```json
{
  "type": "subscribe",
  "endpointId": "endpoint-uuid"
}
```

```json
{
  "type": "unsubscribe"
}
```

### Server → Client
```json
{
  "type": "new_request",
  "data": {
    "id": "request-uuid",
    "method": "POST",
    "headers": {},
    "body": "...",
    "sourceIp": "1.2.3.4",
    "timestamp": 1234567890
  }
}
```

```json
{
  "type": "endpoint_deleted",
  "endpointId": "endpoint-uuid"
}
```

Sent to all clients currently subscribed to the deleted endpoint. The server also clears each client's subscription so no further `new_request` messages are delivered for that endpoint.

## Database Schema

### endpoints
- `id` (TEXT, PRIMARY KEY)
- `session_id` (TEXT, indexed)
- `url_slug` (TEXT, UNIQUE, indexed)
- `created_at` (INTEGER)
- `deleted_at` (INTEGER, nullable) — set on soft-delete; `NULL` means active. Rows are never removed. `getEndpointsBySession` filters `WHERE deleted_at IS NULL`; `getEndpointBySlug` does not filter, so deleted slugs continue to resolve and capture requests.

### request_logs
- `id` (TEXT, PRIMARY KEY)
- `endpoint_id` (TEXT, FOREIGN KEY, indexed)
- `method` (TEXT)
- `headers` (TEXT, JSON)
- `body` (TEXT)
- `query_params` (TEXT, JSON)
- `source_ip` (TEXT)
- `geo_location` (TEXT, JSON)
- `user_agent` (TEXT)
- `timestamp` (INTEGER, indexed)

## Environment Variables

### Backend
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3001)
- `BASE_URL`: Public base URL
- `FRONTEND_URL`: Frontend URL for CORS

### Frontend
- `VITE_API_URL`: Backend API URL

## Monitoring and Logging

### CloudWatch Logs
- `/aws/ecs/rest-analyser` - Application logs
- Retention: 7 days (configurable)

### Metrics
- ECS task CPU/memory utilization
- ALB request count
- EFS storage used
- CloudFront requests/bytes

### Alarms (Recommended)
- High CPU utilization
- High memory utilization
- ALB unhealthy targets
- Cost threshold exceeded

## Next Steps

1. **Development**: `npm run dev`
2. **Deploy to AWS**: `npm run cdk:deploy`
3. **Monitor**: Check CloudWatch logs and metrics
4. **Scale**: Adjust auto-scaling parameters
5. **Optimize**: Review AWS Cost Explorer

## Support Resources

- [Main README](./README.md) - Getting started
- [AWS Deployment Guide](./AWS_DEPLOYMENT.md) - Detailed AWS instructions
- [CDK README](./cdk/README.md) - Infrastructure details
