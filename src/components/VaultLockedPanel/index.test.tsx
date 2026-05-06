import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import VaultLockedPanel from './index';

describe('VaultLockedPanel', () => {
  it('renders default message when no prop given', () => {
    render(<VaultLockedPanel />);
    expect(screen.getByText(/Vault locked/)).toBeInTheDocument();
  });

  it('renders custom message when prop given', () => {
    render(<VaultLockedPanel message="Custom locked text" />);
    expect(screen.getByText('Custom locked text')).toBeInTheDocument();
  });
});
