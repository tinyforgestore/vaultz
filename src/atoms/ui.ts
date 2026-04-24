import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const themeAtom = atomWithStorage<'light' | 'dark' | 'system'>('vaultz-theme', 'system');

export type ActiveModal = 'upgrade' | 'activate' | 'proWelcome' | null;
export const activeModalAtom = atom<ActiveModal>(null);
export const pendingLicenseKeyAtom = atom<string | null>(null);
