export interface LicenseStatus {
  is_active: boolean;
  activation_usage?: number;
  activation_limit?: number;
}

export interface LimitStatus {
  passwords_at_limit: boolean;
  folders_at_limit: boolean;
}
