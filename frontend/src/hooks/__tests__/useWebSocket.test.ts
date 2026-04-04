import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useWebSocket } from '../useWebSocket';

describe('useWebSocket', () => {
  it('should connect to WebSocket server', () => {
    const onMessage = vi.fn();
    renderHook(() => useWebSocket('ws://localhost:3001', onMessage));

    // WebSocket should be created
    expect(global.WebSocket).toBeDefined();
  });

  it('should call onMessage when message is received', async () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() =>
      useWebSocket('ws://localhost:3001', onMessage)
    );

    // Simulate WebSocket message
    const mockMessage = {
      data: JSON.stringify({
        type: 'new_request',
        data: { id: 'log-1', method: 'POST' },
      }),
    };

    // Wait for connection to open
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // Trigger onmessage
    const ws = (global.WebSocket as any).mock.instances[0];
    if (ws.onmessage) {
      ws.onmessage(mockMessage);
    }

    expect(onMessage).toHaveBeenCalledWith({
      type: 'new_request',
      data: { id: 'log-1', method: 'POST' },
    });
  });

  it('should provide sendMessage function', () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() =>
      useWebSocket('ws://localhost:3001', onMessage)
    );

    expect(result.current.sendMessage).toBeDefined();
    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('should send message through WebSocket', async () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() =>
      useWebSocket('ws://localhost:3001', onMessage)
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    const sendSpy = vi.fn();
    const ws = (global.WebSocket as any).mock.instances[0];
    ws.send = sendSpy;

    act(() => {
      result.current.sendMessage({ type: 'subscribe', endpointId: 'test' });
    });

    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', endpointId: 'test' })
    );
  });

  it('should handle WebSocket errors gracefully', () => {
    const onMessage = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useWebSocket('ws://localhost:3001', onMessage));

    const ws = (global.WebSocket as any).mock.instances[0];
    if (ws.onerror) {
      ws.onerror(new Error('Connection failed'));
    }

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  // --- Regression tests for the real-time update bug ---

  describe('StrictMode / intentional close', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('should NOT reconnect when the socket is closed by effect cleanup', async () => {
      // Regression: React StrictMode mount→cleanup→remount caused duplicate connections.
      // Fix: connect() now returns a per-connection cleanup closure with its own private
      // `intentionallyClosed` flag. Calling that cleanup marks the flag true; any
      // subsequent connect() call (remount) gets a fresh flag at false, so the old
      // socket's onclose can never trigger a reconnect even if it fires after the remount.
      const { unmount } = renderHook(() =>
        useWebSocket('ws://localhost:3001', vi.fn())
      );

      // Fire the initial onopen
      await act(async () => {
        vi.runAllTimers();
      });

      expect((global.WebSocket as any).mock.instances).toHaveLength(1);

      // Simulate StrictMode unmount — effect cleanup runs, closes the socket
      unmount();

      // Advance well past the 3 000 ms reconnect window
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Must still be exactly 1 instance — cleanup close must not trigger reconnect
      expect((global.WebSocket as any).mock.instances).toHaveLength(1);
    });

    it('should NOT reconnect if onclose fires after a new connection is already established', async () => {
      // This test targets the precise async-timing failure that affected real browsers.
      // A shared-ref guard would be reset by the remount's connect() call before the
      // old socket's async onclose arrived — causing a phantom third connection.
      // With per-connection closure flags, the old socket's flag stays true permanently.
      const { unmount } = renderHook(() =>
        useWebSocket('ws://localhost:3001', vi.fn())
      );

      await act(async () => { vi.runAllTimers(); });

      const ws1 = (global.WebSocket as any).mock.instances[0];

      // Intercept ws1.close() so its onclose does NOT fire synchronously,
      // simulating the async browser close event.
      let fireWs1Onclose: () => void = () => {};
      ws1.close = () => {
        fireWs1Onclose = () => { if (ws1.onclose) ws1.onclose(); };
      };

      // Cleanup runs: sets intentionallyClosed=true for ws1, calls ws1.close()
      // (which is now deferred — onclose not yet fired)
      unmount();

      // StrictMode remount: connect() creates ws2 with its own intentionallyClosed=false
      renderHook(() => useWebSocket('ws://localhost:3001', vi.fn()));
      await act(async () => { vi.runAllTimers(); }); // fire ws2.onopen

      expect((global.WebSocket as any).mock.instances).toHaveLength(2); // ws1 + ws2

      // Now fire ws1's deferred onclose — simulates the async browser close event
      // arriving after the remount has already created ws2
      act(() => { fireWs1Onclose(); });

      // Advance past reconnect delay — must NOT create ws3
      await act(async () => { vi.advanceTimersByTime(5000); });

      expect((global.WebSocket as any).mock.instances).toHaveLength(2); // still only ws1 + ws2
    });
  });

  describe('connection stability', () => {
    it('should NOT create a new WebSocket when re-rendered with a different onMessage reference', async () => {
      // Regression: onMessage was previously in useCallback deps, so every render with
      // an inline arrow function caused connect() to recreate and the WebSocket to
      // close and reopen — breaking all active subscriptions.
      const { rerender } = renderHook(
        ({ cb }: { cb: (data: any) => void }) =>
          useWebSocket('ws://localhost:3001', cb),
        { initialProps: { cb: vi.fn() } }
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect((global.WebSocket as any).mock.instances).toHaveLength(1);

      // Simulate what React does on every render when onMessage is an inline function
      rerender({ cb: vi.fn() });
      rerender({ cb: vi.fn() });
      rerender({ cb: vi.fn() });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Must still be exactly 1 connection — not one per render
      expect((global.WebSocket as any).mock.instances).toHaveLength(1);
    });
  });

  describe('onConnected callback', () => {
    it('should call onConnected when the WebSocket connection opens', async () => {
      const onConnected = vi.fn();
      renderHook(() => useWebSocket('ws://localhost:3001', vi.fn(), onConnected));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(onConnected).toHaveBeenCalledTimes(1);
    });

    it('should call onConnected again after the WebSocket reconnects', async () => {
      // Regression: previously there was no onConnected callback, so callers had no
      // way to re-subscribe after a disconnect — new requests stopped arriving silently.
      vi.useFakeTimers();

      const onConnected = vi.fn();
      renderHook(() => useWebSocket('ws://localhost:3001', vi.fn(), onConnected));

      // Fire the initial MockWebSocket onopen (uses setTimeout(0) in setup.ts)
      await act(async () => {
        vi.runAllTimers();
      });

      expect(onConnected).toHaveBeenCalledTimes(1);

      // Simulate disconnect — queues setTimeout(connect, 3000)
      const ws1 = (global.WebSocket as any).mock.instances[0];
      act(() => {
        if (ws1.onclose) ws1.onclose();
      });

      // Advance past the 3 000 ms reconnect delay so connect() fires
      await act(async () => {
        vi.advanceTimersByTime(3001);
      });

      // Fire the new WebSocket's onopen
      await act(async () => {
        vi.runAllTimers();
      });

      expect(onConnected).toHaveBeenCalledTimes(2);
    });

    afterEach(() => {
      vi.useRealTimers();
    });
  });

  describe('sendMessage', () => {
    it('should silently drop messages when the WebSocket is not yet open', async () => {
      // Regression guard: sendMessage must not throw and must not send when the socket
      // is still connecting — previously this caused a silent subscription loss on
      // initial page load if the endpoint was selected before the WS opened.
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost:3001', vi.fn())
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const ws = (global.WebSocket as any).mock.instances[0];
      const sendSpy = vi.fn();
      ws.send = sendSpy;
      ws.readyState = 0; // CONNECTING — not open yet

      act(() => {
        result.current.sendMessage({ type: 'subscribe', endpointId: 'test' });
      });

      expect(sendSpy).not.toHaveBeenCalled();
    });
  });
});
