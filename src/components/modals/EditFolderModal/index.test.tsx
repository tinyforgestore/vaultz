import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EditFolderModal from './index';

const defaultInitialData = { name: 'Personal', icon: 'folder' };

describe('EditFolderModal', () => {
  it('renders the dialog title', () => {
    render(<EditFolderModal initialData={defaultInitialData} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Edit Folder')).toBeInTheDocument();
  });

  it('pre-fills the folder name from initialData', () => {
    render(<EditFolderModal initialData={defaultInitialData} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Folder Name *')).toHaveValue('Personal');
  });

  it('calls onConfirm with updated name on submit', () => {
    const onConfirm = vi.fn();
    render(<EditFolderModal initialData={defaultInitialData} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Folder Name *'), { target: { value: 'Work' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ name: 'Work' }));
  });

  it('renders icon picker', () => {
    render(<EditFolderModal initialData={defaultInitialData} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Icon')).toBeInTheDocument();
  });
});
