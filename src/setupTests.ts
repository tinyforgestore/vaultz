import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom does not implement the Clipboard API
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

// jsdom does not implement ResizeObserver (used by Radix UI Slider and ScrollArea)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
