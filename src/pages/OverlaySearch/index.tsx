import { useOverlaySearch } from '@/hooks/useOverlaySearch';
import VaultLockedPanel from '@/components/VaultLockedPanel';
import * as styles from './index.css';

export default function OverlaySearch() {
  const {
    query,
    setQuery,
    results,
    selectedIndex,
    setSelectedIndex,
    isLocked,
    copyPassword,
    hideOverlay: _hideOverlay,
    inputRef,
    handleKeyDown,
  } = useOverlaySearch();
  // _hideOverlay intentionally unused at the JSX layer — exposed for tests
  // and future use; keystroke handling lives in the hook.
  void _hideOverlay;

  if (isLocked) {
    return <VaultLockedPanel />;
  }

  return (
    <div className={styles.container}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search passwords…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className={styles.searchInput}
      />
      {results.length === 0 ? (
        <div className={styles.emptyPanel}>
          {query.trim() === '' ? 'Type to search' : 'No results'}
        </div>
      ) : (
        <div className={styles.resultList}>
          {results.map((entry, idx) => (
            <div
              key={entry.id}
              className={`${styles.resultRow} ${idx === selectedIndex ? styles.resultRowSelected : ''}`}
              onClick={() => copyPassword(entry)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <div>
                <div>{entry.name}</div>
                <div className={styles.resultMeta}>{entry.username}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className={styles.hintRow}>
        <span>Enter / Cmd+P: copy password</span>
        <span>Cmd+E: copy username</span>
        <span>Esc: close</span>
      </div>
    </div>
  );
}
