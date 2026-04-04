/**
 * App integration tests — real-time update behaviour
 *
 * These tests are regression guards for the bug where incoming requests were not
 * reflected in the UI until the browser was refreshed.  The root causes were:
 *
 *   1. onMessage was in useCallback deps → infinite WebSocket reconnect on every render
 *   2. subscribe message sent before WS was OPEN → silently dropped (race condition)
 *   3. No re-subscribe after reconnect → backend lost the client subscription
 */
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock is hoisted before imports by Vitest, so the mocked version is what
// App.tsx receives when it imports from '../services/api'.
vi.mock('../services/api', () => ({
  api: {
    getEndpoints: vi.fn(),
    getRequestLogs: vi.fn(),
    generateUrl: vi.fn(),
  },
}));

import App from '../App';
import { api } from '../services/api';
import { mockEndpoints, mockRequestLogs, mockRequestLog } from '../test/mocks';

describe('App — real-time WebSocket updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Header uses navigator.clipboard; provide a minimal mock so it doesn't throw
    Object.assign(navigator, { clipboard: { writeText: vi.fn() } });
    vi.mocked(api.getEndpoints).mockResolvedValue(mockEndpoints);
    vi.mocked(api.getRequestLogs).mockResolvedValue(mockRequestLogs);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should display a new incoming request without a browser refresh', async () => {
    // Regression: before the fix, WS messages were never delivered because the
    // connection kept resetting on every render.  This test sends a WS message
    // and asserts the UI updates in-place.
    render(<App />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Sanity check: initial requests are visible (GET appears in both list and detail panel)
    expect(screen.getAllByText('GET').length).toBeGreaterThan(0);

    const ws = (global.WebSocket as any).mock.instances[0];

    // Simulate the backend pushing a brand-new DELETE request over the socket
    act(() => {
      if (ws.onmessage) {
        ws.onmessage({
          data: JSON.stringify({
            type: 'new_request',
            data: { ...mockRequestLog, id: 'live-log-1', method: 'DELETE' },
          }),
        });
      }
    });

    // The new method must appear immediately — no refresh required
    // (DELETE appears in both the list badge and the auto-selected detail panel)
    expect(screen.getAllByText('DELETE').length).toBeGreaterThan(0);
  });

  it('should send a subscribe message to the backend when an endpoint is selected', async () => {
    // Regression guard: the subscribe message was sometimes dropped because it was
    // sent before the WebSocket reached readyState OPEN.
    vi.mocked(api.getEndpoints).mockResolvedValue([]);

    render(<App />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const ws = (global.WebSocket as any).mock.instances[0];
    const sendSpy = vi.fn();
    ws.send = sendSpy;

    // Simulate generating a new URL, which auto-selects the new endpoint
    vi.mocked(api.generateUrl).mockResolvedValue(mockEndpoints[0]);
    vi.mocked(api.getRequestLogs).mockResolvedValue([]);

    const generateBtn = screen.getByText('+ Generate New URL');
    await act(async () => {
      generateBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', endpointId: mockEndpoints[0].id })
    );
  });

  it('should re-subscribe to the selected endpoint after the WebSocket reconnects', async () => {
    // Regression: after a disconnect the hook reconnected but never re-sent the
    // subscribe message, so the backend stopped forwarding new requests to the client.
    vi.useFakeTimers();

    // Spy at prototype level so sends from any WS instance are captured
    const sendSpy = vi.spyOn((global.WebSocket as any).prototype, 'send');

    render(<App />);

    // Flush the MockWebSocket setTimeout(0) onopen and the API promise microtasks
    await act(async () => {
      vi.runAllTimers();
      await Promise.resolve();
      await Promise.resolve();
    });
    // A second flush catches effects queued by the first round of state updates
    await act(async () => {
      vi.runAllTimers();
      await Promise.resolve();
    });

    // The first endpoint should have been auto-selected and subscribed to
    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', endpointId: mockEndpoints[0].id })
    );
    sendSpy.mockClear();

    // Simulate the WebSocket dropping — triggers setTimeout(connect, 3000)
    const ws1 = (global.WebSocket as any).mock.instances[0];
    act(() => {
      if (ws1.onclose) ws1.onclose();
    });

    // Jump past the 3 000 ms reconnect delay → connect() runs → new WS created
    await act(async () => {
      vi.advanceTimersByTime(3001);
    });

    // Fire the new connection's onopen → onConnected callback executes
    await act(async () => {
      vi.runAllTimers();
    });

    // onConnected must re-subscribe so the backend resumes forwarding requests
    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', endpointId: mockEndpoints[0].id })
    );

    sendSpy.mockRestore();
  });

  it('should prepend new requests to the list so the latest appears first', async () => {
    // Verify the order: incoming WS messages are prepended, not appended
    render(<App />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const ws = (global.WebSocket as any).mock.instances[0];

    act(() => {
      if (ws.onmessage) {
        ws.onmessage({
          data: JSON.stringify({
            type: 'new_request',
            data: { ...mockRequestLog, id: 'live-log-2', method: 'PATCH' },
          }),
        });
      }
    });

    const methods = screen.getAllByText(/GET|POST|PATCH/);
    // PATCH (newest) must come before GET and POST (from the initial load)
    const patchIndex = methods.findIndex((el) => el.textContent === 'PATCH');
    const getIndex = methods.findIndex((el) => el.textContent === 'GET');
    expect(patchIndex).toBeLessThan(getIndex);
  });

  it('should auto-select a new incoming request even when one is already selected', async () => {
    // When a new request arrives the detail panel should switch to it immediately,
    // replacing whatever was previously selected.
    render(<App />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const ws = (global.WebSocket as any).mock.instances[0];

    // Confirm the initially-loaded request is shown in the detail panel
    expect(screen.getByText('Request Details')).toBeInTheDocument();

    // Push a new request via WebSocket
    act(() => {
      if (ws.onmessage) {
        ws.onmessage({
          data: JSON.stringify({
            type: 'new_request',
            data: { ...mockRequestLog, id: 'live-log-3', method: 'DELETE', sourceIp: '9.9.9.9' },
          }),
        });
      }
    });

    // The detail panel must now show the newly arrived request's IP, not the old one
    const detailsPanel = screen.getByText('Request Details').closest('.request-details-panel');
    expect(detailsPanel).toHaveTextContent('9.9.9.9');
  });
});
