import { Check, AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { ReactNode } from 'react';
import * as styles from './index.css';

type ToastVariant = 'default' | 'success' | 'warning' | 'error';

const ICONS: Record<ToastVariant, LucideIcon> = {
  default: Info,
  success: Check,
  warning: AlertTriangle,
  error: AlertTriangle,
};

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  icon?: ReactNode;
}

export function Toast({ message, variant = 'default', icon }: ToastProps) {
  const DefaultIcon = ICONS[variant];

  return (
    <div className={styles.toastWrapper}>
      <span className={clsx(styles.iconSlot, styles.iconColor?.[variant])}>
        {icon ?? <DefaultIcon size={14} />}
      </span>
      {message}
    </div>
  );
}
