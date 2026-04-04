# REST Endpoint Analyser

A web application for analyzing REST API requests. Generate unique HTTPS URLs and monitor incoming requests with detailed information about headers, body, source IP, geolocation, and more.

## Features

- **Generate Unique URLs**: Create unique endpoint URLs to receive REST requests
- **Real-time Monitoring**: View requests as they arrive with WebSocket support
- **Request Details**: See comprehensive information including:
  - HTTP method
  - Headers
  - Request body
  - Query parameters
  - Source IP address
  - Geolocation (city, region, country, timezone)
  - User agent
  - Timestamp
- **Request History**: Navigate through all requests to an endpoint
- **Sticky URLs**: Previously generated URLs persist across sessions on the same device/browser
- **Multiple Endpoints**: Generate and switch between multiple monitoring URLs
- **Delete Endpoints**: Soft-delete endpoints to remove them from your list while preserving all historical request logs; the URL slug returns 404 for any new incoming requests after deletion

## Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express and TypeScript (Node <= 22)
- **Database**: SQLite
- **Real-time**: WebSocket for live request updates
- **Geolocation**: geoip-lite for IP-based location lookup

## Installation

1. Install dependencies for all projects:
```bash
npm run install:all
```

2. Create necessary directories:
```bash
mkdir -p backend/data
```

## Development

Start both frontend and backend in development mode:
```bash
npm run dev
```

This will start:
- Backend on http://localhost:3001
- Frontend on http://localhost:5173

### Individual Commands

Start only backend:
```bash
npm run dev:backend
```

Start only frontend:
```bash
npm run dev:frontend
```

## Production Build

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Docker Deployment

### Local Docker

Run the backend in Docker locally:
```bash
npm run docker:local
```

This will:
- Build a Docker image
- Run the container on port 3001
- Mount local data directory for persistence

### Manual Docker Build

```bash
cd backend
docker build -t rest-analyser-backend .
docker run -p 3001:3001 -v $(pwd)/data:/app/data rest-analyser-backend
```

## AWS Deployment

Deploy to AWS using CDK for a production-ready, cost-effective infrastructure.

### Quick Deploy

```bash
npm run install:all
npm run cdk:deploy
```

### Cost Estimate

**~$70-90/month** for low-medium traffic using:
- ECS Fargate (minimal resources: 0.25 vCPU, 0.5GB RAM)
- Application Load Balancer with WebSocket support
- EFS for SQLite database persistence
- S3 + CloudFront for frontend hosting
- Single NAT Gateway (cost-optimized)

### Architecture

- **Frontend**: S3 + CloudFront (global CDN)
- **Backend**: ECS Fargate (containerized, auto-scaling)
- **Database**: EFS + SQLite (persistent storage)
- **Networking**: VPC with ALB for WebSocket support

For detailed AWS deployment instructions, see [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md)

### AWS Prerequisites

1. AWS Account
2. AWS CLI configured: `aws configure`
3. CDK CLI: `npm install -g aws-cdk`
4. Docker installed

### Deploy with Custom Domain

Edit `cdk/bin/rest-analyser.ts` to add your domain and certificate ARN, then deploy.

### Destroy AWS Resources

```bash
npm run cdk:destroy
```

## Usage

1. Open the application in your browser (http://localhost:5173)
2. Click "Generate New URL" to create a new endpoint
3. Copy the generated URL
4. Send REST requests to the generated URL using any HTTP client (curl, Postman, etc.)
5. Watch requests appear in real-time in the application
6. Click on any request to view its details
7. Switch between different endpoints using the sidebar
8. Click "Delete" on an endpoint to remove it from your list — all request history is preserved but the URL will return 404 for any new incoming requests

## Example Request

```bash
curl -X POST http://localhost:3001/e/abc12345 \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, World!"}'
```

## Architecture

- **Backend** (`/backend`):
  - Express server handling API requests and endpoint proxying
  - SQLite database for storing endpoints and request logs
  - WebSocket server for real-time updates
  - Session management using cookies

- **Frontend** (`/frontend`):
  - React application with TypeScript
  - Real-time WebSocket connection for live updates
  - Responsive UI with endpoint and request management

## Testing

The project includes comprehensive test suites for both backend and frontend.

### Run All Tests
```bash
npm test
```

### Run Backend Tests
```bash
npm run test:backend
```

### Run Frontend Tests
```bash
npm run test:frontend
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Reports
```bash
npm run test:coverage
```

**Test Coverage**:
- ✅ Backend: Database operations, API endpoints, request logging, soft-delete
- ✅ Frontend: Components, hooks, services, user interactions, delete flows
- ✅ Integration: End-to-end API flows, WebSocket disconnect on delete

For detailed testing documentation, see [TESTING.md](./TESTING.md)

## Environment Variables

Backend (.env in `/backend`):
```
PORT=3001
BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
```

Frontend (.env in `/frontend`):
```
VITE_API_URL=http://localhost:3001
```

## License

MIT
