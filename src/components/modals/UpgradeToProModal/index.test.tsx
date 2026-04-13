import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }));

import { openUrl } from '@tauri-apps/plugin-opener';
import UpgradeToProModal from './index';

describe('UpgradeToProModal', () => {
  it('renders the upgrade heading', () => {
    render(<UpgradeToProModal onClose={vi.fn()} onActivate={vi.fn()} />);
    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
  });

  it('renders the benefits list', () => {
    render(<UpgradeToProModal onClose={vi.fn()} onActivate={vi.fn()} />);
    expect(screen.getByText('Unlimited passwords')).toBeInTheDocument();
    expect(screen.getByText('Unlimited folders')).toBeInTheDocument();
  });

  it('calls openUrl when Buy on Gumroad is clicked', () => {
    render(<UpgradeToProModal onClose={vi.fn()} onActivate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Buy on Gumroad/i }));
    expect(openUrl).toHaveBeenCalledWith(expect.stringContaining('gumroad.com'));
  });

  it('calls onActivate when activate link is clicked', () => {
    const onActivate = vi.fn();
    render(<UpgradeToProModal onClose={vi.fn()} onActivate={onActivate} />);
    fireEvent.click(screen.getByText(/Already have a license key/));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    render(<UpgradeToProModal onClose={onClose} onActivate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalled();
  });
});
