import { ArrowLeft, Copy, Trash2 } from 'lucide-react';
import { Button, Flex, IconButton } from '@radix-ui/themes';
import { useGeneratedPasswordsPage } from '@/hooks/useGeneratedPasswordsPage';
import { Toast } from '@/components/Toast';
import GeneratedPasswordItem from '@/components/GeneratedPasswordItem';
import * as styles from './index.css';

export default function GeneratedPasswordsPage() {
  const {
    history,
    hiddenIds,
    confirmClear,
    selectedIndex,
    setSelectedIndex,
    copiedId,
    clipboardToast,
    handleCopy,
    handleDelete,
    handleRequestClearAll,
    handleCancelClearAll,
    handleConfirmClearAll,
    handleCreateEntry,
    handleBack,
    handleReveal,
    handleHide,
  } = useGeneratedPasswordsPage();

  return (
    <div className={styles.container}>
      <div className={styles.header} data-tauri-drag-region>
        <div className={styles.headerLeft}>
          <IconButton size="1" variant="ghost" onClick={handleBack} aria-label="Back">
            <ArrowLeft size={14} />
          </IconButton>
          <span className={styles.headerTitle}>Generated Passwords</span>
        </div>
        <Flex gap="2">
          {confirmClear ? (
            <>
              <Button size="1" variant="soft" color="gray" onClick={handleCancelClearAll}>
                Cancel
              </Button>
              <Button size="1" color="red" onClick={handleConfirmClearAll}>
                Confirm Clear
              </Button>
            </>
          ) : (
            <Button
              size="1"
              variant="soft"
              color="red"
              onClick={handleRequestClearAll}
              disabled={history.length === 0}
            >
              <Trash2 size={12} /> Clear All
            </Button>
          )}
        </Flex>
      </div>

      <div className={styles.contentArea}>
        {history.length === 0 ? (
          <div className={styles.empty}>
            <span>No generated passwords yet.</span>
            <span>Press Cmd+Shift+G to open the generator.</span>
          </div>
        ) : (
          <ul className={styles.list}>
            {history.map((item, index) => (
              <GeneratedPasswordItem
                key={item.id}
                item={item}
                isHidden={hiddenIds.has(item.id)}
                isSelected={selectedIndex === index}
                isCopied={copiedId === String(item.id)}
                onSelect={() => setSelectedIndex(index)}
                onReveal={() => handleReveal(item.id)}
                onHide={() => handleHide(item.id)}
                onCopy={() => handleCopy(item)}
                onCreateEntry={() => handleCreateEntry(item.password)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {clipboardToast && (
        <div className={styles.toastContainer}>
          <Toast message={clipboardToast} icon={<Copy size={14} />} />
        </div>
      )}
    </div>
  );
}
