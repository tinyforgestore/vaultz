import React from 'react';
import { createStore, Provider } from 'jotai';
import { renderHook, type RenderHookOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

export function createTestStore() {
  return createStore();
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
