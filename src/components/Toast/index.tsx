import { Check, AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import * as styles from './index.css';

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
    <div className={styles.toastWrapper}>
      <span className={styles.iconSlot} style={{ color: iconColor }}>
        {icon ?? <DefaultIcon size={14} />}
      </span>
      {message}
    </div>
  );
}
