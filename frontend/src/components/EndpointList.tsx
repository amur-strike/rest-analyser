import { Endpoint } from '../types';
import './EndpointList.css';

interface EndpointListProps {
  endpoints: Endpoint[];
  selectedEndpoint: Endpoint | null;
  onSelectEndpoint: (endpoint: Endpoint) => void;
}

export function EndpointList({
  endpoints,
  selectedEndpoint,
  onSelectEndpoint
}: EndpointListProps) {
  const copyToClipboard = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="endpoint-list">
      <div className="endpoint-list-header">
        <h2>Your Endpoints</h2>
        <span className="endpoint-count">{endpoints.length}</span>
      </div>
      <div className="endpoint-items">
        {endpoints.length === 0 ? (
          <div className="empty-state">
            <p>No endpoints yet</p>
            <p className="empty-state-hint">Generate a new URL to get started</p>
          </div>
        ) : (
          endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              className={`endpoint-item ${
                selectedEndpoint?.id === endpoint.id ? 'active' : ''
              }`}
              onClick={() => onSelectEndpoint(endpoint)}
            >
              <div className="endpoint-info">
                <div className="endpoint-slug">/{endpoint.slug}</div>
                <div className="endpoint-date">{formatDate(endpoint.createdAt)}</div>
              </div>
              <button
                className="btn-copy"
                onClick={(e) => copyToClipboard(endpoint.url, e)}
                title="Copy URL"
              >
                Copy
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
