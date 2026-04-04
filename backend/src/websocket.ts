import { WebSocketServer, WebSocket } from 'ws';

interface ClientConnection {
  ws: WebSocket;
  endpointId: string | null;
}

const clients: Map<string, ClientConnection> = new Map();

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    const clientId = generateClientId();
    clients.set(clientId, { ws, endpointId: null });

    console.log(`WebSocket client connected: ${clientId}`);

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'subscribe' && data.endpointId) {
          const client = clients.get(clientId);
          if (client) {
            client.endpointId = data.endpointId;
            console.log(`Client ${clientId} subscribed to endpoint ${data.endpointId}`);
          }
        }

        if (data.type === 'unsubscribe') {
          const client = clients.get(clientId);
          if (client) {
            client.endpointId = null;
            console.log(`Client ${clientId} unsubscribed`);
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`WebSocket client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      clients.delete(clientId);
    });
  });

  console.log('WebSocket server initialized');
}

export function broadcastNewRequest(endpointId: string, requestData: any) {
  clients.forEach((client) => {
    if (client.endpointId === endpointId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: 'new_request',
        data: requestData
      }));
    }
  });
}

function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
