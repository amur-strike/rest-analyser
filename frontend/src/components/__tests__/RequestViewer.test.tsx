import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RequestViewer } from '../RequestViewer';
import { mockEndpoint, mockRequestLogs } from '../../test/mocks';

describe('RequestViewer', () => {
  it('should show empty state when no endpoint selected', () => {
    render(
      <RequestViewer
        endpoint={null}
        requests={[]}
        selectedRequest={null}
        onSelectRequest={() => {}}
        loading={false}
      />
    );

    expect(screen.getByText('No Endpoint Selected')).toBeInTheDocument();
  });

  it('should show endpoint URL when endpoint is selected', () => {
    render(
      <RequestViewer
        endpoint={mockEndpoint}
        requests={[]}
        selectedRequest={null}
        onSelectRequest={() => {}}
        loading={false}
      />
    );

    expect(screen.getByText(mockEndpoint.url)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <RequestViewer
        endpoint={mockEndpoint}
        requests={[]}
        selectedRequest={null}
        onSelectRequest={() => {}}
        loading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show empty requests message', () => {
    render(
      <RequestViewer
        endpoint={mockEndpoint}
        requests={[]}
        selectedRequest={null}
        onSelectRequest={() => {}}
        loading={false}
      />
    );

    expect(screen.getByText('No requests yet')).toBeInTheDocument();
  });

  it('should render list of requests', () => {
    render(
      <RequestViewer
        endpoint={mockEndpoint}
        requests={mockRequestLogs}
        selectedRequest={null}
        onSelectRequest={() => {}}
        loading={false}
      />
    );

    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
  });

  it('should show request count', () => {
    render(
      <RequestViewer
        endpoint={mockEndpoint}
        requests={mockRequestLogs}
        selectedRequest={null}
        onSelectRequest={() => {}}
        loading={false}
      />
    );

    expect(screen.getByText('2 requests')).toBeInTheDocument();
  });

  it('should show singular "request" for one request', () => {
    render(
      <RequestViewer
        endpoint={mockEndpoint}
        requests={[mockRequestLogs[0]]}
        selectedRequest={null}
        onSelectRequest={() => {}}
        loading={false}
      />
    );

    expect(screen.getByText('1 request')).toBeInTheDocument();
  });

  it('should call onSelectRequest when request is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <RequestViewer
        endpoint={mockEndpoint}
        requests={mockRequestLogs}
        selectedRequest={null}
        onSelectRequest={handleSelect}
        loading={false}
      />
    );

    const requestItem = screen.getByText('GET').closest('.request-list-item');
    fireEvent.click(requestItem!);

    expect(handleSelect).toHaveBeenCalledWith(mockRequestLogs[0]);
  });

  it('should display request details when request is selected', () => {
    render(
      <RequestViewer
        endpoint={mockEndpoint}
        requests={mockRequestLogs}
        selectedRequest={mockRequestLogs[1]}
        onSelectRequest={() => {}}
        loading={false}
      />
    );

    expect(screen.getByText('Request Details')).toBeInTheDocument();

    // Find the detail-value section specifically (not the request-ip in the list)
    const detailsPanel = screen.getByText('Request Details').closest('.request-details-panel');
    expect(within(detailsPanel!).getByText('5.6.7.8')).toBeInTheDocument();
    expect(screen.getByText('New York, NY, US (America/New_York)')).toBeInTheDocument();
  });

  it('should display headers in request details', () => {
    render(
      <RequestViewer
        endpoint={mockEndpoint}
        requests={mockRequestLogs}
        selectedRequest={mockRequestLogs[1]}
        onSelectRequest={() => {}}
        loading={false}
      />
    );

    expect(screen.getByText('Headers')).toBeInTheDocument();
    const headersText = screen.getByText(/"content-type"/);
    expect(headersText).toBeInTheDocument();
  });

  it('should display body in request details when present', () => {
    render(
      <RequestViewer
        endpoint={mockEndpoint}
        requests={mockRequestLogs}
        selectedRequest={mockRequestLogs[1]}
        onSelectRequest={() => {}}
        loading={false}
      />
    );

    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('{"data": "test"}')).toBeInTheDocument();
  });

  it('should not display body section when body is null', () => {
    render(
      <RequestViewer
        endpoint={mockEndpoint}
        requests={mockRequestLogs}
        selectedRequest={mockRequestLogs[0]}
        onSelectRequest={() => {}}
        loading={false}
      />
    );

    const bodySections = screen.queryAllByText('Body');
    expect(bodySections).toHaveLength(0);
  });
});
