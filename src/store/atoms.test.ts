import { describe, it, expect, vi } from 'vitest';
import { createStore } from 'jotai';

vi.mock('@tauri-apps/api/core');

import {
  selectedFolderAtom,
  searchQueryAtom,
  favoriteAlertAtom,
  selectedPasswordIdsAtom,
  isAuthenticatedAtom,
  allPasswordsAtom,
  foldersAtom,
  filteredPasswordsAtom,
} from './atoms';
import { SPECIAL_FOLDERS } from '@/constants/folders';
import type { Password } from '@/types';

function store() {
  return createStore();
}

const makePassword = (overrides: Partial<Password> = {}): Password => ({
  id: 'p1',
  name: 'GitHub',
  username: 'user',
  password: 'secret',
  isFavorite: false,
  folderId: 'f1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('base atoms — initial values', () => {
  it('selectedFolderAtom defaults to ALL', () => {
    const s = store();
    expect(s.get(selectedFolderAtom)).toBe(SPECIAL_FOLDERS.ALL.toString());
  });

  it('searchQueryAtom defaults to empty string', () => {
    const s = store();
    expect(s.get(searchQueryAtom)).toBe('');
  });

  it('favoriteAlertAtom defaults to empty string', () => {
    const s = store();
    expect(s.get(favoriteAlertAtom)).toBe('');
  });

  it('selectedPasswordIdsAtom defaults to empty Set', () => {
    const s = store();
    expect(s.get(selectedPasswordIdsAtom).size).toBe(0);
  });

  it('allPasswordsAtom defaults to empty array', () => {
    const s = store();
    expect(s.get(allPasswordsAtom)).toEqual([]);
  });

  it('foldersAtom defaults to empty array', () => {
    const s = store();
    expect(s.get(foldersAtom)).toEqual([]);
  });
});

describe('filteredPasswordsAtom', () => {
  const passwords = [
    makePassword({ id: 'p1', name: 'GitHub', folderId: 'f1', isFavorite: true }),
    makePassword({ id: 'p2', name: 'GitLab', folderId: 'f1', isFavorite: false }),
    makePassword({ id: 'p3', name: 'AWS',    folderId: 'f2', isFavorite: false }),
  ];

  function storeWithPasswords() {
    const s = store();
    s.set(allPasswordsAtom, passwords);
    return s;
  }

  it('returns all passwords when folder is ALL', () => {
    const s = storeWithPasswords();
    s.set(selectedFolderAtom, SPECIAL_FOLDERS.ALL.toString());
    expect(s.get(filteredPasswordsAtom)).toHaveLength(3);
  });

  it('returns only favorites when folder is FAVORITES', () => {
    const s = storeWithPasswords();
    s.set(selectedFolderAtom, SPECIAL_FOLDERS.FAVORITES.toString());
    const result = s.get(filteredPasswordsAtom);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('filters by specific folderId', () => {
    const s = storeWithPasswords();
    s.set(selectedFolderAtom, 'f2');
    const result = s.get(filteredPasswordsAtom);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p3');
  });

  it('filters by search query (name)', () => {
    const s = storeWithPasswords();
    s.set(selectedFolderAtom, SPECIAL_FOLDERS.ALL.toString());
    s.set(searchQueryAtom, 'git');
    const result = s.get(filteredPasswordsAtom);
    expect(result).toHaveLength(2);
    expect(result.map(p => p.id)).toContain('p1');
    expect(result.map(p => p.id)).toContain('p2');
  });

  it('search is case-insensitive', () => {
    const s = storeWithPasswords();
    s.set(selectedFolderAtom, SPECIAL_FOLDERS.ALL.toString());
    s.set(searchQueryAtom, 'GITHUB');
    expect(s.get(filteredPasswordsAtom)).toHaveLength(1);
  });

  it('returns empty array when no passwords match', () => {
    const s = storeWithPasswords();
    s.set(searchQueryAtom, 'zzznomatch');
    expect(s.get(filteredPasswordsAtom)).toHaveLength(0);
  });

  it('pins favorites first within a folder view', () => {
    const s = storeWithPasswords();
    s.set(selectedFolderAtom, 'f1');
    const result = s.get(filteredPasswordsAtom);
    expect(result[0].isFavorite).toBe(true);
  });
});

describe('isAuthenticatedAtom', () => {
  it('can be set to true', () => {
    const s = store();
    s.set(isAuthenticatedAtom, true);
    expect(s.get(isAuthenticatedAtom)).toBe(true);
  });
});
