import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteFolderModal from './index';

describe('DeleteFolderModal', () => {
  it('renders the folder name', () => {
    render(<DeleteFolderModal folderName="Work" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('calls onConfirm when Delete button is clicked', () => {
    const onConfirm = vi.fn();
    render(<DeleteFolderModal folderName="Work" onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders the warning message about passwords being moved', () => {
    render(<DeleteFolderModal folderName="Work" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/moved to the default folder/)).toBeInTheDocument();
  });
});
