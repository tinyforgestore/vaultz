import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast } from './index';

describe('Toast', () => {
  it('renders the message text', () => {
    render(<Toast message="Copied to clipboard" />);
    expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
  });

  it('renders with default variant (info icon area present)', () => {
    const { container } = render(<Toast message="Hello" />);
    // Icon slot exists
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('renders success variant without crashing', () => {
    render(<Toast message="Done!" variant="success" />);
    expect(screen.getByText('Done!')).toBeInTheDocument();
  });

  it('renders warning variant without crashing', () => {
    render(<Toast message="Careful!" variant="warning" />);
    expect(screen.getByText('Careful!')).toBeInTheDocument();
  });

  it('renders error variant without crashing', () => {
    render(<Toast message="Error occurred" variant="error" />);
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });

  it('renders a custom icon when provided', () => {
    const CustomIcon = () => <svg data-testid="custom-icon" />;
    render(<Toast message="Custom" icon={<CustomIcon />} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});
