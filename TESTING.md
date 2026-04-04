# Testing Guide

Comprehensive test suite for the REST Endpoint Analyser application.

## Test Coverage

### Backend Tests

**Unit Tests** (`backend/tests/unit/`):
- ✅ Database operations (CRUD for endpoints and request logs)
- ✅ Data validation and constraints
- ✅ Error handling
- ✅ Soft-delete: sets `deleted_at`, returns correct boolean, session-scoped, double-delete guard
- ✅ Soft-delete: deleted endpoint excluded from session list but slug still resolves
- ✅ Soft-delete: all request logs preserved after deletion

**Integration Tests** (`backend/tests/integration/`):
- ✅ API endpoints (generate URL, fetch endpoints, fetch logs)
- ✅ Dynamic endpoint request handling (GET, POST, PUT, DELETE)
- ✅ Request logging (headers, body, query params)
- ✅ Session management
- ✅ Multiple concurrent requests
- ✅ DELETE /api/endpoints/:id returns 204 on success
- ✅ DELETE /api/endpoints/:id returns 404 for non-existent or already-deleted endpoint
- ✅ DELETE /api/endpoints/:id returns 404 for cross-session attempt (session isolation)
- ✅ Deleted endpoint removed from GET /api/endpoints response
- ✅ Slug returns 404 for new requests after deletion (no further logging)
- ✅ Request logs accessible via API after deletion
- ✅ `notifyEndpointDeleted` called with correct ID on success
- ✅ `notifyEndpointDeleted` not called when deletion fails

### Frontend Tests

**Integration Tests** (`frontend/src/__tests__/`):
- ✅ App component — real-time request display without browser refresh
- ✅ WebSocket subscribe message sent on endpoint selection
- ✅ WebSocket re-subscription after reconnect
- ✅ Incoming request prepended to list (newest first)
- ✅ Incoming request auto-selected in detail panel (replaces previous selection)
- ✅ `endpoint_deleted` WS message removes endpoint from sidebar list
- ✅ `endpoint_deleted` WS message clears selection and shows "No Endpoint Selected" when the deleted endpoint was active
- ✅ `endpoint_deleted` WS message preserves selection when a non-selected endpoint is deleted
- ✅ Delete button calls `api.deleteEndpoint` and removes endpoint from list
- ✅ Delete button on selected endpoint clears selection and shows "No Endpoint Selected"
- ✅ Delete button on non-selected endpoint preserves the current selection

**Component Tests** (`frontend/src/components/__tests__/`):
- ✅ Header component
- ✅ EndpointList component (empty state, list rendering, selection, copy URL)
- ✅ EndpointList delete button: rendered per endpoint, calls `onDeleteEndpoint` with correct ID, does not trigger `onSelectEndpoint`
- ✅ RequestViewer component (request list, details display)

**Service Tests** (`frontend/src/services/__tests__/`):
- ✅ API client functionality
- ✅ HTTP request handling
- ✅ `deleteEndpoint` sends DELETE to correct URL and resolves without a value

**Hook Tests** (`frontend/src/hooks/__tests__/`):
- ✅ WebSocket connection
- ✅ Message sending/receiving
- ✅ No reconnect when socket is closed by effect cleanup (StrictMode / unmount)
- ✅ No reconnect if async `onclose` fires after a new connection is already established
- ✅ Connection stability (no reconnect on re-render with new callback reference)
- ✅ `onConnected` callback fires on initial open
- ✅ `onConnected` callback fires again after reconnect
- ✅ `sendMessage` silently dropped when socket is not yet open

## Running Tests

### All Tests

Run all backend and frontend tests:
```bash
npm test
```

### Backend Tests Only

```bash
npm run test:backend
```

Or directly:
```bash
cd backend
npm test
```

### Frontend Tests Only

```bash
npm run test:frontend
```

Or directly:
```bash
cd frontend
npm test
```

### Watch Mode

Run tests in watch mode (re-runs on file changes):
```bash
npm run test:watch
```

### Coverage Reports

Generate coverage reports:
```bash
npm run test:coverage
```

Backend coverage report will be in: `backend/coverage/`
Frontend coverage report will be in: `frontend/coverage/`

### Visual Test UI (Frontend)

Run Vitest UI for interactive test running:
```bash
cd frontend
npm run test:ui
```

## Test Structure

### Backend

```
backend/
├── tests/
│   ├── setup.ts              # Test setup and cleanup
│   ├── unit/
│   │   └── database.test.ts  # Database unit tests
│   └── integration/
│       └── api.test.ts       # API integration tests
└── jest.config.js            # Jest configuration
```

### Frontend

```
frontend/
├── src/
│   ├── test/
│   │   ├── setup.ts          # Test setup (MockWebSocket, jest-dom)
│   │   └── mocks.ts          # Shared mock data (endpoints, request logs)
│   ├── __tests__/
│   │   └── App.test.tsx      # App integration tests (real-time update regression)
│   ├── components/__tests__/
│   │   ├── Header.test.tsx
│   │   ├── EndpointList.test.tsx
│   │   └── RequestViewer.test.tsx
│   ├── services/__tests__/
│   │   └── api.test.ts
│   └── hooks/__tests__/
│       └── useWebSocket.test.ts
└── vitest.config.ts          # Vitest configuration
```

## Test Technologies

### Backend
- **Jest**: Test framework
- **ts-jest**: TypeScript support for Jest
- **Supertest**: HTTP assertion library
- **SQLite**: In-memory database for tests

### Frontend
- **Vitest**: Fast Vite-native test framework
- **React Testing Library**: React component testing
- **@testing-library/jest-dom**: Custom Jest matchers
- **jsdom**: Browser environment simulation

## Writing Tests

### Backend Test Example

```typescript
import request from 'supertest';
import { app } from '../../src/server';

describe('API Endpoint', () => {
  it('should generate a new URL', async () => {
    const response = await request(app)
      .post('/api/generate-url')
      .expect(200);

    expect(response.body).toHaveProperty('url');
    expect(response.body).toHaveProperty('slug');
  });
});
```

### Frontend Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';

describe('Header', () => {
  it('should call onGenerateUrl when button is clicked', () => {
    const handleClick = vi.fn();
    render(<Header onGenerateUrl={handleClick} />);

    fireEvent.click(screen.getByText('+ Generate New URL'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Test Coverage Goals

Current coverage targets:
- **Backend**: > 80% overall
- **Frontend**: > 70% overall
- **Critical paths**: 100% (URL generation, request logging)

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm run install:all
      - run: npm test
      - run: npm run test:coverage
```

## Test Scenarios Covered

### Backend

1. **URL Generation**
   - ✅ Generate unique URL
   - ✅ Session cookie creation
   - ✅ URL uniqueness constraint

2. **Endpoint Management**
   - ✅ Fetch endpoints by session
   - ✅ Endpoint isolation between sessions
   - ✅ Non-existent endpoint handling
   - ✅ Soft-delete endpoint (204, removed from list)
   - ✅ Delete returns 404 for non-existent, already-deleted, or cross-session endpoint
   - ✅ URL slug continues accepting requests after deletion
   - ✅ Request logs preserved and accessible after deletion
   - ✅ `notifyEndpointDeleted` called only on successful delete

3. **Request Logging**
   - ✅ All HTTP methods (GET, POST, PUT, DELETE)
   - ✅ Headers capture
   - ✅ Body capture (JSON and raw)
   - ✅ Query parameters
   - ✅ Source IP extraction
   - ✅ Multiple sequential requests
   - ✅ Request ordering (most recent first)

4. **Database Operations**
   - ✅ CRUD operations
   - ✅ Data integrity
   - ✅ Null value handling
   - ✅ Foreign key constraints
   - ✅ Soft-delete: `deleted_at` set, session-scoped, double-delete guard
   - ✅ Soft-delete: slug still resolves via `getEndpointBySlug`
   - ✅ Soft-delete: logs preserved via `getRequestLogsByEndpoint`

### Frontend

1. **Component Rendering**
   - ✅ Empty states
   - ✅ List rendering
   - ✅ Data display

2. **User Interactions**
   - ✅ Button clicks
   - ✅ Item selection
   - ✅ Copy to clipboard
   - ✅ Delete endpoint (button click, API call, state update)
   - ✅ Delete does not trigger endpoint selection

3. **State Management**
   - ✅ Selected endpoint highlighting
   - ✅ Request count display
   - ✅ Loading states

4. **WebSocket**
   - ✅ Connection establishment
   - ✅ Message sending
   - ✅ Message receiving
   - ✅ Error handling
   - ✅ Connection stability (no reconnect loop on re-render)
   - ✅ No reconnect when socket is intentionally closed by effect cleanup (StrictMode guard)
   - ✅ No reconnect if async `onclose` fires after the remount has already opened a new connection
   - ✅ `onConnected` callback fires on open and on every reconnect
   - ✅ Subscribe message dropped gracefully when socket not yet open

5. **Real-time Updates (Regression)**
   - ✅ New incoming requests appear in UI without browser refresh
   - ✅ Subscribe message sent to backend when endpoint is selected
   - ✅ Subscribe message re-sent after WebSocket reconnects
   - ✅ New requests prepended to list (newest first)
   - ✅ New request auto-selected in detail panel, replacing any previous selection
   - ✅ No duplicate requests from StrictMode double-mount — intentional close does not reconnect even when `onclose` fires asynchronously after remount

6. **Endpoint Deletion**
   - ✅ `endpoint_deleted` WS message removes the endpoint from sidebar
   - ✅ `endpoint_deleted` WS message clears selection and shows "No Endpoint Selected" for the active endpoint
   - ✅ `endpoint_deleted` WS message leaves the current selection unchanged when a different endpoint is deleted
   - ✅ Delete button triggers API call and removes endpoint from list
   - ✅ Delete button on the selected endpoint clears the detail panel
   - ✅ Delete button on a non-selected endpoint preserves the current selection and viewer

## Debugging Tests

### Backend

View detailed test output:
```bash
cd backend
npm test -- --verbose
```

Run specific test file:
```bash
cd backend
npm test -- database.test.ts
```

Run specific test:
```bash
cd backend
npm test -- -t "should create a new endpoint"
```

### Frontend

Run specific test file:
```bash
cd frontend
npm test -- Header.test.tsx
```

Run with debug output:
```bash
cd frontend
npm test -- --reporter=verbose
```

## Common Issues

### Issue: Tests timeout
**Solution**: Increase timeout in test files:
```typescript
it('slow test', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Issue: Database locked
**Solution**: Ensure proper cleanup in `afterEach`:
```typescript
afterEach(() => {
  db.close();
});
```

### Issue: WebSocket connection fails
**Solution**: Check mock implementation in `setup.ts`

### Issue: WebSocket tests show multiple connections per render
**Cause**: `onMessage` callback was previously in `useCallback` deps — every render with
an inline arrow function recreated `connect()`, triggering a new connection.
**Solution**: Callbacks are now stored in refs (`onMessageRef`, `onConnectedRef`) and
excluded from `useCallback` deps. The connection stability test guards this regression.

### Issue: Requests appear twice in the UI (duplicate delivery)
**Cause**: React StrictMode intentionally runs mount → cleanup → remount. In a real browser
`ws.close()` fires `onclose` **asynchronously**. A shared ref used to guard against reconnect
was reset by the remount's `connect()` call before the old socket's async `onclose` fired,
so the reconnect timer was still queued. This created a third connection alongside the remount
connection; both subscribed to the same endpoint and both received every broadcast.
**Solution**: `connect()` now returns its own cleanup function that captures an
`intentionallyClosed` local variable in a closure specific to that connection instance.
No subsequent `connect()` call can reset it, so the async `onclose` of an intentionally-closed
socket always skips the reconnect. Genuine network-drop `onclose` events (where no cleanup ran)
still trigger the reconnect correctly.

### Issue: Port already in use
**Solution**: Tests should use supertest (no actual server) or random ports

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up resources (database, files)
3. **Mocking**: Mock external dependencies (WebSocket, API calls)
4. **Descriptive**: Use clear test descriptions
5. **AAA Pattern**: Arrange, Act, Assert
6. **Edge Cases**: Test error conditions and edge cases

## Next Steps

1. Add E2E tests with Playwright or Cypress
2. Add performance tests
3. Add load tests for the backend
4. Set up automated testing in CI/CD
5. Monitor test coverage trends

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
