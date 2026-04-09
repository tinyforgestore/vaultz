import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom does not implement the Clipboard API
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});
