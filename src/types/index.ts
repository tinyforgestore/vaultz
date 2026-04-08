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
