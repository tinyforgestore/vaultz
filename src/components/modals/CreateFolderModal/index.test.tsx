import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateFolderModal from './index';

describe('CreateFolderModal', () => {
  it('renders the dialog title', () => {
    render(<CreateFolderModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Create New Folder')).toBeInTheDocument();
  });

  it('renders the folder name input', () => {
    render(<CreateFolderModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Folder Name *')).toBeInTheDocument();
  });

  it('calls onConfirm with folder data on submit', () => {
    const onConfirm = vi.fn();
    render(<CreateFolderModal onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Folder Name *'), { target: { value: 'Work' } });
    fireEvent.click(screen.getByRole('button', { name: /^Create$/i }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Work' })
    );
  });

  it('renders icon picker buttons', () => {
    render(<CreateFolderModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Icon')).toBeInTheDocument();
  });
});
