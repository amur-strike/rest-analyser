import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { EndpointList } from './components/EndpointList';
import { RequestViewer } from './components/RequestViewer';
import { api } from './services/api';
import { useWebSocket } from './hooks/useWebSocket';
import type { Endpoint, RequestLog } from './types';
import './App.css';

function App() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestLog | null>(null);
  const [loading, setLoading] = useState(false);

  // Refs so the onConnected callback can always access the latest values
  // without being recreated on each render (which would cause WS reconnect loops).
  const selectedEndpointRef = useRef<Endpoint | null>(null);
  const sendMessageRef = useRef<(data: any) => void>(() => {});
  selectedEndpointRef.current = selectedEndpoint;

  const { sendMessage } = useWebSocket(
    'ws://localhost:3001',
    (message) => {
      if (message.type === 'new_request') {
        setRequests((prev) => [message.data, ...prev]);
        setSelectedRequest(message.data);
      }
      if (message.type === 'endpoint_deleted') {
        const deletedId = message.endpointId;
        setEndpoints((prev) => prev.filter((e) => e.id !== deletedId));
        setSelectedEndpoint((prev) => (prev?.id === deletedId ? null : prev));
        setRequests([]);
        setSelectedRequest(null);
      }
    },
    () => {
      // Re-subscribe whenever the WebSocket (re)connects so we don't lose
      // our subscription after a disconnect or initial connection race.
      if (selectedEndpointRef.current) {
        sendMessageRef.current({ type: 'subscribe', endpointId: selectedEndpointRef.current.id });
      }
    }
  );

  // Keep ref in sync with the stable sendMessage from the hook.
  sendMessageRef.current = sendMessage;

  useEffect(() => {
    loadEndpoints();
  }, []);

  useEffect(() => {
    if (selectedEndpoint) {
      loadRequests(selectedEndpoint.id);
      sendMessage({
        type: 'subscribe',
        endpointId: selectedEndpoint.id
      });
    } else {
      sendMessage({ type: 'unsubscribe' });
    }
  }, [selectedEndpoint]);

  const loadEndpoints = async () => {
    try {
      const data = await api.getEndpoints();
      setEndpoints(data);
      if (data.length > 0 && !selectedEndpoint) {
        setSelectedEndpoint(data[0]);
      }
    } catch (error) {
      console.error('Failed to load endpoints:', error);
    }
  };

  const loadRequests = async (endpointId: string) => {
    setLoading(true);
    try {
      const data = await api.getRequestLogs(endpointId);
      setRequests(data);
      if (data.length > 0) {
        setSelectedRequest(data[0]);
      } else {
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEndpoint = async (endpointId: string) => {
    try {
      await api.deleteEndpoint(endpointId);
      // The server sends an `endpoint_deleted` WS message to subscribed clients.
      // For unsubscribed clients (e.g. the endpoint wasn't selected), update state directly.
      setEndpoints((prev) => prev.filter((e) => e.id !== endpointId));
      setSelectedEndpoint((prev) => (prev?.id === endpointId ? null : prev));
      if (selectedEndpoint?.id === endpointId) {
        setRequests([]);
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('Failed to delete endpoint:', error);
    }
  };

  const handleGenerateUrl = async () => {
    try {
      const newEndpoint = await api.generateUrl();
      setEndpoints([newEndpoint, ...endpoints]);
      setSelectedEndpoint(newEndpoint);
    } catch (error) {
      console.error('Failed to generate URL:', error);
    }
  };

  return (
    <div className="app">
      <Header onGenerateUrl={handleGenerateUrl} />
      <div className="main-container">
        <EndpointList
          endpoints={endpoints}
          selectedEndpoint={selectedEndpoint}
          onSelectEndpoint={setSelectedEndpoint}
          onDeleteEndpoint={handleDeleteEndpoint}
        />
        <RequestViewer
          endpoint={selectedEndpoint}
          requests={requests}
          selectedRequest={selectedRequest}
          onSelectRequest={setSelectedRequest}
          loading={loading}
        />
      </div>
    </div>
  );
}

export default App;
