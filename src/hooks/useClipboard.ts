import { useState, useRef, useEffect } from 'react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { invoke } from '@tauri-apps/api/core';
import { CLIPBOARD_CLEAR_DELAY_MS, CLIPBOARD_CLEAR_DELAY_S, CLIPBOARD_FEEDBACK_MS, CLIPBOARD_TOAST_MS } from '@/constants/clipboard';

export function useClipboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [clipboardToast, setClipboardToast] = useState<string | null>(null);
  const clipboardTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearTimers = () => {
    clearTimeout(clipboardTimerRef.current);
    clearTimeout(feedbackTimerRef.current);
    clearTimeout(toastTimerRef.current);
  };

  useEffect(() => () => clearTimers(), []);

  const handleCopyPassword = (id: string, password: string) => {
    clearTimers();
    invoke('write_secret_to_clipboard', { text: password }).catch(() => {});
    setCopiedId(id);
    setClipboardToast(`Copied — clipboard clears in ${CLIPBOARD_CLEAR_DELAY_S}s`);
    feedbackTimerRef.current = setTimeout(() => setCopiedId(null), CLIPBOARD_FEEDBACK_MS);
    toastTimerRef.current = setTimeout(() => setClipboardToast(null), CLIPBOARD_TOAST_MS);
    clipboardTimerRef.current = setTimeout(() => {
      writeText('').catch(() => {});
      setClipboardToast('Clipboard cleared');
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setClipboardToast(null), CLIPBOARD_FEEDBACK_MS);
    }, CLIPBOARD_CLEAR_DELAY_MS);
  };

  return { copiedId, clipboardToast, handleCopyPassword };
}
