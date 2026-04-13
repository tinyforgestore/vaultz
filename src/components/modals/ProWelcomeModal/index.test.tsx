import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProWelcomeModal from './index';

describe('ProWelcomeModal', () => {
  it('renders the welcome heading', () => {
    render(<ProWelcomeModal onClose={vi.fn()} />);
    expect(screen.getByText('Welcome to Pro!')).toBeInTheDocument();
  });

  it('renders the benefit subtitle', () => {
    render(<ProWelcomeModal onClose={vi.fn()} />);
    expect(screen.getByText(/unlimited entries and folders/i)).toBeInTheDocument();
  });

  it('calls onClose when Got it button is clicked', () => {
    const onClose = vi.fn();
    render(<ProWelcomeModal onClose={onClose} />);
    fireEvent.click(screen.getByText('Got it'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    render(<ProWelcomeModal onClose={onClose} />);
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalled();
  });
});
