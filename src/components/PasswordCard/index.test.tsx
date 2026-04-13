import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordCard } from './index';
import { makePassword } from '@/testUtils';

const defaultProps = {
  isSelectionMode: false,
  isSelected: false,
  copiedId: null,
  showFolderTag: false,
  folderName: undefined,
  folderIcon: undefined,
  onCardClick: vi.fn(),
  onCopyPassword: vi.fn(),
  onToggleFavorite: vi.fn(),
  onToggleSelection: vi.fn(),
};

describe('PasswordCard', () => {
  it('renders the password name and username', () => {
    render(<PasswordCard password={makePassword()} {...defaultProps} />);
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('calls onCardClick when card is clicked in normal mode', () => {
    const onCardClick = vi.fn();
    render(<PasswordCard password={makePassword()} {...defaultProps} onCardClick={onCardClick} />);
    fireEvent.click(screen.getByText('GitHub'));
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleSelection when clicked in selection mode', () => {
    const onToggleSelection = vi.fn();
    render(
      <PasswordCard
        password={makePassword()}
        {...defaultProps}
        isSelectionMode={true}
        onToggleSelection={onToggleSelection}
      />
    );
    fireEvent.click(screen.getByText('GitHub'));
    expect(onToggleSelection).toHaveBeenCalledTimes(1);
  });

  it('shows the folder tag when showFolderTag is true and folderName is set', () => {
    render(
      <PasswordCard
        password={makePassword()}
        {...defaultProps}
        showFolderTag={true}
        folderName="Work"
        folderIcon="folder"
      />
    );
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('does not show folder tag when showFolderTag is false', () => {
    render(
      <PasswordCard
        password={makePassword()}
        {...defaultProps}
        showFolderTag={false}
        folderName="Work"
      />
    );
    expect(screen.queryByText('Work')).not.toBeInTheDocument();
  });

  it('calls onCopyPassword when copy button is clicked', () => {
    const onCopyPassword = vi.fn();
    render(<PasswordCard password={makePassword()} {...defaultProps} onCopyPassword={onCopyPassword} />);
    // Click the copy button (not the card itself)
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onCopyPassword).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleFavorite when star button is clicked', () => {
    const onToggleFavorite = vi.fn();
    render(<PasswordCard password={makePassword()} {...defaultProps} onToggleFavorite={onToggleFavorite} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  });
});
