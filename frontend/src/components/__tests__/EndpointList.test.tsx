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
        onDeleteEndpoint={() => {}}
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
        onDeleteEndpoint={() => {}}
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
        onDeleteEndpoint={() => {}}
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
        onDeleteEndpoint={() => {}}
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
        onDeleteEndpoint={() => {}}
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
        onDeleteEndpoint={() => {}}
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
        onDeleteEndpoint={() => {}}
      />
    );

    const copyButton = screen.getAllByText('Copy')[0];
    fireEvent.click(copyButton);

    expect(handleSelect).not.toHaveBeenCalled();
  });

  describe('delete button', () => {
    it('should render a delete button for each endpoint', () => {
      render(
        <EndpointList
          endpoints={mockEndpoints}
          selectedEndpoint={null}
          onSelectEndpoint={() => {}}
          onDeleteEndpoint={() => {}}
        />
      );

      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons).toHaveLength(mockEndpoints.length);
    });

    it('should call onDeleteEndpoint with the correct endpoint ID when delete is clicked', () => {
      const handleDelete = vi.fn();
      render(
        <EndpointList
          endpoints={mockEndpoints}
          selectedEndpoint={null}
          onSelectEndpoint={() => {}}
          onDeleteEndpoint={handleDelete}
        />
      );

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(handleDelete).toHaveBeenCalledWith(mockEndpoints[0].id);
    });

    it('should not trigger onSelectEndpoint when delete button is clicked', () => {
      const handleSelect = vi.fn();
      const handleDelete = vi.fn();
      render(
        <EndpointList
          endpoints={mockEndpoints}
          selectedEndpoint={null}
          onSelectEndpoint={handleSelect}
          onDeleteEndpoint={handleDelete}
        />
      );

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(handleSelect).not.toHaveBeenCalled();
      expect(handleDelete).toHaveBeenCalledTimes(1);
    });

    it('should call onDeleteEndpoint with the correct ID for each endpoint', () => {
      const handleDelete = vi.fn();
      render(
        <EndpointList
          endpoints={mockEndpoints}
          selectedEndpoint={null}
          onSelectEndpoint={() => {}}
          onDeleteEndpoint={handleDelete}
        />
      );

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[1]);

      expect(handleDelete).toHaveBeenCalledWith(mockEndpoints[1].id);
    });
  });
});
