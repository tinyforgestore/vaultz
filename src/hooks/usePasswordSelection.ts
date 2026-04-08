import { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { selectedPasswordIdsAtom, bulkDeleteAtom, bulkToggleFavoriteAtom } from '@/store/atoms';
import { Password } from '@/types';

export function usePasswordSelection(passwords: Password[]) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useAtom(selectedPasswordIdsAtom);
  const bulkDelete = useSetAtom(bulkDeleteAtom);
  const bulkToggleFavorite = useSetAtom(bulkToggleFavoriteAtom);

  const toggleSelectionMode = () => {
    if (isSelectionMode) setSelectedIds(new Set());
    setIsSelectionMode(prev => !prev);
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => setSelectedIds(new Set(passwords.map(p => p.id)));
  const deselectAll = () => { if (selectedIds.size > 0) setSelectedIds(new Set()); };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleteOpen(true);
  };

  const confirmBulkDelete = async () => {
    await bulkDelete();
    setIsBulkDeleteOpen(false);
    setIsSelectionMode(false);
  };

  const handleBulkToggleFavorite = async (favorite: boolean) => {
    await bulkToggleFavorite(favorite);
    setIsSelectionMode(false);
  };

  return {
    isSelectionMode,
    isBulkDeleteOpen,
    selectedIds,
    setIsBulkDeleteOpen,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    deselectAll,
    handleBulkDelete,
    confirmBulkDelete,
    handleBulkToggleFavorite,
  };
}
