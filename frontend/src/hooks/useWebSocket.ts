import { useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url: string, onMessage: (data: any) => void, onConnected?: () => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  // Use refs for callbacks so they never appear in useCallback deps,
  // preventing connect() from re-creating on every render.
  const onMessageRef = useRef(onMessage);
  const onConnectedRef = useRef(onConnected);
  onMessageRef.current = onMessage;
  onConnectedRef.current = onConnected;

  // connect() returns its own cleanup function so that each connection instance
  // has a private `intentionallyClosed` flag. A shared ref would be reset by
  // the next connect() call before the browser fires the async onclose of the
  // previous socket — the root cause of duplicate entries in React StrictMode.
  const connect = useCallback((): (() => void) => {
    // Private to this specific connection instance.
    let intentionallyClosed = false;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connected');
        onConnectedRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        if (intentionallyClosed) return; // intentional close — do not reconnect
        console.log('WebSocket disconnected, reconnecting...');
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      wsRef.current = ws;

      return () => {
        intentionallyClosed = true;
        clearTimeout(reconnectTimeoutRef.current);
        ws.close();
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
      return () => {
        intentionallyClosed = true;
        clearTimeout(reconnectTimeoutRef.current);
      };
    }
  }, [url]); // onMessage/onConnected intentionally excluded — accessed via refs

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { sendMessage };
}
