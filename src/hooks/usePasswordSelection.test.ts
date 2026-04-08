import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');

import { renderHookWithProviders } from '@/testUtils';
import { usePasswordSelection } from './usePasswordSelection';
import type { Password } from '@/types';

const makePassword = (id: string): Password => ({
  id,
  name: `Password ${id}`,
  username: 'user',
  password: 'secret',
  isFavorite: false,
  folderId: 'f1',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const passwords = [makePassword('p1'), makePassword('p2'), makePassword('p3')];

function setup(pws = passwords) {
  return renderHookWithProviders(() => usePasswordSelection(pws));
}

describe('usePasswordSelection', () => {
  describe('selection mode', () => {
    it('starts inactive', () => {
      const { result } = setup();
      expect(result.current.isSelectionMode).toBe(false);
    });

    it('toggleSelectionMode activates selection mode', () => {
      const { result } = setup();
      act(() => result.current.toggleSelectionMode());
      expect(result.current.isSelectionMode).toBe(true);
    });

    it('toggleSelectionMode deactivates and clears selected ids', () => {
      const { result } = setup();
      act(() => result.current.toggleSelectionMode());
      act(() => result.current.toggleSelection('p1'));
      expect(result.current.selectedIds.size).toBe(1);
      act(() => result.current.toggleSelectionMode());
      expect(result.current.isSelectionMode).toBe(false);
      expect(result.current.selectedIds.size).toBe(0);
    });
  });

  describe('toggleSelection', () => {
    it('adds an id to the selection', () => {
      const { result } = setup();
      act(() => result.current.toggleSelection('p1'));
      expect(result.current.selectedIds.has('p1')).toBe(true);
    });

    it('removes an already-selected id', () => {
      const { result } = setup();
      act(() => result.current.toggleSelection('p1'));
      act(() => result.current.toggleSelection('p1'));
      expect(result.current.selectedIds.has('p1')).toBe(false);
    });

    it('can select multiple ids independently', () => {
      const { result } = setup();
      act(() => result.current.toggleSelection('p1'));
      act(() => result.current.toggleSelection('p2'));
      expect(result.current.selectedIds.size).toBe(2);
    });
  });

  describe('selectAll / deselectAll', () => {
    it('selectAll selects all provided passwords', () => {
      const { result } = setup();
      act(() => result.current.selectAll());
      expect(result.current.selectedIds.size).toBe(3);
    });

    it('deselectAll clears all selections', () => {
      const { result } = setup();
      act(() => result.current.selectAll());
      act(() => result.current.deselectAll());
      expect(result.current.selectedIds.size).toBe(0);
    });

    it('deselectAll is a no-op when already empty', () => {
      const { result } = setup();
      // Should not cause a state update — just verify it doesn't throw
      act(() => result.current.deselectAll());
      expect(result.current.selectedIds.size).toBe(0);
    });
  });

  describe('bulk delete', () => {
    it('handleBulkDelete does nothing when selection is empty', () => {
      const { result } = setup();
      act(() => result.current.handleBulkDelete());
      expect(result.current.isBulkDeleteOpen).toBe(false);
    });

    it('handleBulkDelete opens modal when ids are selected', () => {
      const { result } = setup();
      act(() => result.current.toggleSelection('p1'));
      act(() => result.current.handleBulkDelete());
      expect(result.current.isBulkDeleteOpen).toBe(true);
    });

    it('confirmBulkDelete closes modal and exits selection mode', async () => {
      const { result } = setup();
      act(() => result.current.toggleSelection('p1'));
      act(() => result.current.handleBulkDelete());
      await act(async () => result.current.confirmBulkDelete());
      expect(result.current.isBulkDeleteOpen).toBe(false);
      expect(result.current.isSelectionMode).toBe(false);
    });
  });

  describe('bulk toggle favorite', () => {
    it('handleBulkToggleFavorite exits selection mode', async () => {
      const { result } = setup();
      act(() => result.current.toggleSelectionMode());
      await act(async () => result.current.handleBulkToggleFavorite(true));
      expect(result.current.isSelectionMode).toBe(false);
    });
  });
});
