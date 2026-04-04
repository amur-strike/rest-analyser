import { Endpoint, RequestLog } from '../types';
import './RequestViewer.css';

interface RequestViewerProps {
  endpoint: Endpoint | null;
  requests: RequestLog[];
  selectedRequest: RequestLog | null;
  onSelectRequest: (request: RequestLog) => void;
  loading: boolean;
}

export function RequestViewer({
  endpoint,
  requests,
  selectedRequest,
  onSelectRequest,
  loading
}: RequestViewerProps) {
  if (!endpoint) {
    return (
      <div className="request-viewer">
        <div className="empty-viewer">
          <h2>No Endpoint Selected</h2>
          <p>Select an endpoint or generate a new one to start monitoring requests</p>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getMethodColor = (method: string) => {
    const colors: { [key: string]: string } = {
      GET: '#00d4ff',
      POST: '#00ff88',
      PUT: '#ffaa00',
      DELETE: '#ff4444',
      PATCH: '#ff00ff'
    };
    return colors[method] || '#888';
  };

  return (
    <div className="request-viewer">
      <div className="viewer-header">
        <div>
          <h2>Monitoring Endpoint</h2>
          <div className="endpoint-url">{endpoint.url}</div>
        </div>
        <div className="request-count">
          {requests.length} request{requests.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="viewer-content">
        <div className="request-list-panel">
          <h3>Request History</h3>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="empty-requests">
              <p>No requests yet</p>
              <p className="hint">Send a request to this endpoint to see it here</p>
            </div>
          ) : (
            <div className="request-list">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`request-list-item ${
                    selectedRequest?.id === request.id ? 'active' : ''
                  }`}
                  onClick={() => onSelectRequest(request)}
                >
                  <div className="request-method" style={{ color: getMethodColor(request.method) }}>
                    {request.method}
                  </div>
                  <div className="request-time">{formatDate(request.timestamp)}</div>
                  <div className="request-ip">{request.sourceIp}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedRequest && (
          <div className="request-details-panel">
            <h3>Request Details</h3>
            <div className="request-details">
              <div className="detail-section">
                <h4>Method</h4>
                <div className="method-badge" style={{ backgroundColor: getMethodColor(selectedRequest.method) }}>
                  {selectedRequest.method}
                </div>
              </div>

              <div className="detail-section">
                <h4>Timestamp</h4>
                <div className="detail-value">{formatDate(selectedRequest.timestamp)}</div>
              </div>

              <div className="detail-section">
                <h4>Source IP</h4>
                <div className="detail-value">{selectedRequest.sourceIp}</div>
              </div>

              {selectedRequest.geoLocation && (
                <div className="detail-section">
                  <h4>Location</h4>
                  <div className="detail-value">
                    {selectedRequest.geoLocation.city}, {selectedRequest.geoLocation.region}, {selectedRequest.geoLocation.country}
                    {selectedRequest.geoLocation.timezone && ` (${selectedRequest.geoLocation.timezone})`}
                  </div>
                </div>
              )}

              {selectedRequest.userAgent && (
                <div className="detail-section">
                  <h4>User Agent</h4>
                  <div className="detail-value code">{selectedRequest.userAgent}</div>
                </div>
              )}

              <div className="detail-section">
                <h4>Headers</h4>
                <pre className="code-block">
                  {JSON.stringify(selectedRequest.headers, null, 2)}
                </pre>
              </div>

              {selectedRequest.queryParams && Object.keys(selectedRequest.queryParams).length > 0 && (
                <div className="detail-section">
                  <h4>Query Parameters</h4>
                  <pre className="code-block">
                    {JSON.stringify(selectedRequest.queryParams, null, 2)}
                  </pre>
                </div>
              )}

              {selectedRequest.body && (
                <div className="detail-section">
                  <h4>Body</h4>
                  <pre className="code-block">
                    {selectedRequest.body}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
