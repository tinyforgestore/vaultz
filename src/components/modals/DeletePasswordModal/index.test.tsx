import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeletePasswordModal from './index';

describe('DeletePasswordModal', () => {
  describe('single password mode', () => {
    it('renders the password name', () => {
      render(<DeletePasswordModal passwordName="GitHub" onConfirm={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('GitHub')).toBeInTheDocument();
    });

    it('renders singular title', () => {
      render(<DeletePasswordModal passwordName="GitHub" onConfirm={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Delete Password?')).toBeInTheDocument();
    });
  });

  describe('bulk mode (number)', () => {
    it('renders plural title for multiple passwords', () => {
      render(<DeletePasswordModal passwordName={3} onConfirm={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Delete Passwords?')).toBeInTheDocument();
      expect(screen.getByText(/3 passwords/)).toBeInTheDocument();
    });

    it('renders singular word for count of 1', () => {
      render(<DeletePasswordModal passwordName={1} onConfirm={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText(/1 password[^s]/)).toBeInTheDocument();
    });
  });

  it('calls onConfirm when Delete button is clicked', () => {
    const onConfirm = vi.fn();
    render(<DeletePasswordModal passwordName="GitHub" onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<DeletePasswordModal passwordName="GitHub" onConfirm={vi.fn()} onCancel={onCancel} />);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });

  afterEach(() => vi.clearAllMocks());
});
