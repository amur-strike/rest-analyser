import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EndpointList } from '../EndpointList';
import { mockEndpoints } from '../../test/mocks';

describe('EndpointList', () => {
  it('should render empty state when no endpoints', () => {
    render(
      <EndpointList
        endpoints={[]}
        selectedEndpoint={null}
        onSelectEndpoint={() => {}}
      />
    );

    expect(screen.getByText('No endpoints yet')).toBeInTheDocument();
    expect(screen.getByText('Generate a new URL to get started')).toBeInTheDocument();
  });

  it('should render list of endpoints', () => {
    render(
      <EndpointList
        endpoints={mockEndpoints}
        selectedEndpoint={null}
        onSelectEndpoint={() => {}}
      />
    );

    expect(screen.getByText('/abc123')).toBeInTheDocument();
    expect(screen.getByText('/def456')).toBeInTheDocument();
  });

  it('should show endpoint count', () => {
    render(
      <EndpointList
        endpoints={mockEndpoints}
        selectedEndpoint={null}
        onSelectEndpoint={() => {}}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should highlight selected endpoint', () => {
    render(
      <EndpointList
        endpoints={mockEndpoints}
        selectedEndpoint={mockEndpoints[0]}
        onSelectEndpoint={() => {}}
      />
    );

    const endpointItem = screen.getByText('/abc123').closest('.endpoint-item');
    expect(endpointItem).toHaveClass('active');
  });

  it('should call onSelectEndpoint when endpoint is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <EndpointList
        endpoints={mockEndpoints}
        selectedEndpoint={null}
        onSelectEndpoint={handleSelect}
      />
    );

    const endpointItem = screen.getByText('/abc123').closest('.endpoint-item');
    fireEvent.click(endpointItem!);

    expect(handleSelect).toHaveBeenCalledWith(mockEndpoints[0]);
  });

  it('should copy URL to clipboard when copy button is clicked', async () => {
    const writeTextMock = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <EndpointList
        endpoints={mockEndpoints}
        selectedEndpoint={null}
        onSelectEndpoint={() => {}}
      />
    );

    const copyButtons = screen.getAllByText('Copy');
    fireEvent.click(copyButtons[0]);

    expect(writeTextMock).toHaveBeenCalledWith(mockEndpoints[0].url);
  });

  it('should not trigger onSelectEndpoint when copy button is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <EndpointList
        endpoints={mockEndpoints}
        selectedEndpoint={null}
        onSelectEndpoint={handleSelect}
      />
    );

    const copyButton = screen.getAllByText('Copy')[0];
    fireEvent.click(copyButton);

    expect(handleSelect).not.toHaveBeenCalled();
  });
});
