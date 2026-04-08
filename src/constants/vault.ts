import type { DialogFilter } from '@tauri-apps/plugin-dialog';

export const VAULT_FILE_FILTER: DialogFilter = {
  name: 'Vault Export',
  extensions: ['pmvault'],
};
