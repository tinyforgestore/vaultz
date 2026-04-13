import React from 'react';
import { createStore, Provider } from 'jotai';
import { renderHook, type RenderHookOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Password, Folder } from '@/types';

export function createTestStore() {
  return createStore();
}

export function makePassword(overrides: Partial<Password> = {}): Password {
  return {
    id: 'p1',
    name: 'GitHub',
    username: 'user@example.com',
    password: 'secret',
    isFavorite: false,
    folderId: 'f1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeFolder(overrides: Partial<Folder> = {}): Folder {
  return {
    id: 'f1',
    name: 'Folder f1',
    icon: 'folder',
    isDefault: false,
    createdAt: new Date(),
    ...overrides,
  };
}

interface WrapperOptions {
  store?: ReturnType<typeof createStore>;
  initialPath?: string;
}

export function renderHookWithProviders<T>(
  hook: () => T,
  { store, initialPath = '/' }: WrapperOptions = {},
  options?: Omit<RenderHookOptions<T>, 'wrapper'>,
) {
  const testStore = store ?? createTestStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialPath]}>
      <Provider store={testStore}>{children}</Provider>
    </MemoryRouter>
  );
  return { ...renderHook(hook, { wrapper, ...options }), store: testStore };
}
