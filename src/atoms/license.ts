import { atom } from 'jotai';
import { LicenseStatus } from '@/types/license';

export const licenseStatusAtom = atom<LicenseStatus | null>(null);
