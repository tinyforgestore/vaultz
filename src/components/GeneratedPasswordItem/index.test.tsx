import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import GeneratedPasswordItem from './index';

const baseItem = { id: 1, password: 'secret-pw', createdAt: '2026-04-28 12:00:00' };

const baseHandlers = () => ({
  onSelect: vi.fn(),
  onReveal: vi.fn(),
  onHide: vi.fn(),
  onCopy: vi.fn(),
  onCreateEntry: vi.fn(),
  onDelete: vi.fn(),
});

function renderItem(props: Partial<React.ComponentProps<typeof GeneratedPasswordItem>> = {}) {
  const handlers = baseHandlers();
  const merged = {
    item: baseItem,
    isHidden: false,
    isSelected: false,
    isCopied: false,
    ...handlers,
    ...props,
  };
  render(
    <Theme>
      <ul>
        <GeneratedPasswordItem {...merged} />
      </ul>
    </Theme>,
  );
  return merged;
}

describe('GeneratedPasswordItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the password in plaintext when not hidden', () => {
    renderItem();
    expect(screen.getByTestId('password-1').textContent).toBe('secret-pw');
  });

  it('renders masked dots when hidden', () => {
    renderItem({ isHidden: true });
    expect(screen.getByTestId('password-1').textContent).not.toContain('secret-pw');
    expect(screen.getByTestId('password-1').textContent).toContain('•');
  });

  it('shows EyeOff button when revealed and calls onHide', () => {
    const props = renderItem();
    fireEvent.click(screen.getByLabelText('Hide password'));
    expect(props.onHide).toHaveBeenCalledTimes(1);
  });

  it('shows Eye button when hidden and calls onReveal', () => {
    const props = renderItem({ isHidden: true });
    fireEvent.click(screen.getByLabelText('Reveal password'));
    expect(props.onReveal).toHaveBeenCalledTimes(1);
  });

  it('calls onCopy when the copy button is clicked', () => {
    const props = renderItem();
    fireEvent.click(screen.getByLabelText('Copy password'));
    expect(props.onCopy).toHaveBeenCalledTimes(1);
  });

  it('renders Check icon when isCopied is true', () => {
    renderItem({ isCopied: true });
    // Check icon from lucide renders as svg with role/class — easiest: assert the Copy button still exists but has different inner content via its container
    const copyBtn = screen.getByLabelText('Copy password');
    // Lucide Check has data-lucide="check" attribute on the svg
    expect(copyBtn.querySelector('svg')?.classList.toString()).toContain('check');
  });

  it('calls onCreateEntry when the + button is clicked', () => {
    const props = renderItem();
    fireEvent.click(screen.getByLabelText('Create entry'));
    expect(props.onCreateEntry).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when the trash button is clicked', () => {
    const props = renderItem();
    fireEvent.click(screen.getByLabelText('Delete'));
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect when the row is clicked', () => {
    const props = renderItem();
    fireEvent.click(screen.getByTestId('password-1'));
    expect(props.onSelect).toHaveBeenCalled();
  });
});
