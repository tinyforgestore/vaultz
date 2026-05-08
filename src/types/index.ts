export interface Password {
  id: string;
  name: string;
  username?: string;
  email?: string;
  password: string;
  website?: string;
  notes?: string;
  recoveryEmail?: string;
  isFavorite: boolean;
  folderId: string;
  // `favicon` stores a Simple Icons slug (e.g. "github"), not a URL or image.
  // Null is a meaningful state on update (user picked "None" in the picker)
  // and is sent as JSON `null` so the Rust side clears the column.
  favicon?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  icon: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface CreatePasswordInput {
  serviceName: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  folder?: string;
  favicon?: string | null;
}

export interface PasswordFormData {
  serviceName: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  folder: string;
  favicon?: string | null;
}

export interface CreateFolderInput {
  name: string;
  icon: string;
}

export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
}
