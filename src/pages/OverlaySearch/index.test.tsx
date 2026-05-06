import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';

const mockHook = vi.fn();
vi.mock('@/hooks/useOverlaySearch', () => ({
  useOverlaySearch: () => mockHook(),
}));

import OverlaySearch from './index';

const makeBase = () => ({
  query: '',
  setQuery: vi.fn(),
  results: [],
  selectedIndex: 0,
  setSelectedIndex: vi.fn(),
  isLocked: false,
  copyPassword: vi.fn(),
  copyUsername: vi.fn(),
  hideOverlay: vi.fn(),
  inputRef: createRef<HTMLInputElement>(),
  handleKeyDown: vi.fn(),
});

describe('OverlaySearch', () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  it('renders the locked panel when vault is locked', () => {
    mockHook.mockReturnValue({ ...makeBase(), isLocked: true });
    render(<OverlaySearch />);
    expect(screen.getByText(/Vault locked/)).toBeInTheDocument();
  });

  it('renders search input and empty state when unlocked + no query', () => {
    mockHook.mockReturnValue(makeBase());
    render(<OverlaySearch />);
    expect(screen.getByPlaceholderText(/Search passwords/)).toBeInTheDocument();
    expect(screen.getByText(/Type to search/)).toBeInTheDocument();
  });

  it('renders results when present', () => {
    mockHook.mockReturnValue({
      ...makeBase(),
      query: 'gh',
      results: [
        { id: '1', name: 'GitHub', username: 'u@x.com', password: 'p' },
        { id: '2', name: 'GitLab', username: 'u2@x.com', password: 'p2' },
      ],
    });
    render(<OverlaySearch />);
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('GitLab')).toBeInTheDocument();
  });

  it('forwards keydown events to hook handleKeyDown', () => {
    const onKey = vi.fn();
    mockHook.mockReturnValue({ ...makeBase(), handleKeyDown: onKey });
    render(<OverlaySearch />);
    fireEvent.keyDown(screen.getByPlaceholderText(/Search passwords/), { key: 'Enter' });
    expect(onKey).toHaveBeenCalled();
  });

  it('typing in the input calls setQuery', () => {
    const setQuery = vi.fn();
    mockHook.mockReturnValue({ ...makeBase(), setQuery });
    render(<OverlaySearch />);
    fireEvent.change(screen.getByPlaceholderText(/Search passwords/), {
      target: { value: 'git' },
    });
    expect(setQuery).toHaveBeenCalledWith('git');
  });

  it('clicking a result copies its password', () => {
    const copy = vi.fn();
    mockHook.mockReturnValue({
      ...makeBase(),
      results: [{ id: '1', name: 'GH', username: 'u', password: 'p' }],
      copyPassword: copy,
    });
    render(<OverlaySearch />);
    fireEvent.click(screen.getByText('GH'));
    expect(copy).toHaveBeenCalled();
  });

  it('mousing over a result updates selectedIndex', () => {
    const setIdx = vi.fn();
    mockHook.mockReturnValue({
      ...makeBase(),
      results: [
        { id: '1', name: 'A', username: 'u', password: 'p' },
        { id: '2', name: 'B', username: 'u', password: 'p' },
      ],
      setSelectedIndex: setIdx,
    });
    render(<OverlaySearch />);
    fireEvent.mouseEnter(screen.getByText('B'));
    expect(setIdx).toHaveBeenCalledWith(1);
  });

  it('renders "No results" when query non-empty but results empty', () => {
    mockHook.mockReturnValue({ ...makeBase(), query: 'xyz', results: [] });
    render(<OverlaySearch />);
    expect(screen.getByText(/No results/)).toBeInTheDocument();
  });

  it('hint row reflects Cmd+P / Cmd+E shortcuts (no bare-P)', () => {
    mockHook.mockReturnValue(makeBase());
    render(<OverlaySearch />);
    expect(screen.getByText(/Cmd\+P/)).toBeInTheDocument();
    expect(screen.getByText(/Cmd\+E: copy username/)).toBeInTheDocument();
  });

  it('renders all results and shows username metadata', () => {
    mockHook.mockReturnValue({
      ...makeBase(),
      results: [
        { id: '1', name: 'A', username: 'aaa@x', password: 'p' },
        { id: '2', name: 'B', username: 'bbb@x', password: 'p' },
      ],
      selectedIndex: 1,
    });
    render(<OverlaySearch />);
    expect(screen.getByText('aaa@x')).toBeInTheDocument();
    expect(screen.getByText('bbb@x')).toBeInTheDocument();
  });
});
