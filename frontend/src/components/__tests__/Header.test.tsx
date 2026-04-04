import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../Header';

describe('Header', () => {
  it('should render the title', () => {
    render(<Header onGenerateUrl={() => {}} />);
    expect(screen.getByText('REST Endpoint Analyser')).toBeInTheDocument();
  });

  it('should render generate button', () => {
    render(<Header onGenerateUrl={() => {}} />);
    expect(screen.getByText('+ Generate New URL')).toBeInTheDocument();
  });

  it('should call onGenerateUrl when button is clicked', () => {
    const handleGenerateUrl = vi.fn();
    render(<Header onGenerateUrl={handleGenerateUrl} />);

    const button = screen.getByText('+ Generate New URL');
    fireEvent.click(button);

    expect(handleGenerateUrl).toHaveBeenCalledTimes(1);
  });
});
