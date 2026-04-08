import { Check, AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

type ToastVariant = 'default' | 'success' | 'warning' | 'error';

const ICONS: Record<ToastVariant, LucideIcon> = {
  default: Info,
  success: Check,
  warning: AlertTriangle,
  error: AlertTriangle,
};

const ICON_COLORS: Record<ToastVariant, string> = {
  default: 'var(--blue-9)',
  success: 'var(--green-9)',
  warning: 'var(--amber-9)',
  error: 'var(--red-9)',
};

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  icon?: ReactNode;
}

export function Toast({ message, variant = 'default', icon }: ToastProps) {
  const DefaultIcon = ICONS[variant];
  const iconColor = ICON_COLORS[variant];

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      background: 'var(--gray-12)',
      color: 'var(--gray-1)',
      padding: '8px 14px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '500',
      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      whiteSpace: 'nowrap',
      userSelect: 'none',
    }}>
      <span style={{ color: iconColor, display: 'flex', alignItems: 'center' }}>
        {icon ?? <DefaultIcon size={14} />}
      </span>
      {message}
    </div>
  );
}
