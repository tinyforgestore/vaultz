use std::path::PathBuf;
use std::sync::Mutex;
use std::time::SystemTime;
use tauri::{AppHandle, Manager, State};

use crate::database::Database;

pub const DEFAULT_LOCK_TIMEOUT_SECS: u64 = 5 * 60;

/// Converts an optional lock timeout (in minutes, as stored in the DB) to seconds.
/// - `None` → 0 (never lock — user's explicit choice)
/// - `Some(m)` → `m * 60`
/// DB errors are NOT handled here; callers decide the fallback.
pub fn db_minutes_to_secs(minutes: Option<i64>) -> u64 {
    minutes.map(|m| (m.max(0) as u64) * 60).unwrap_or(0)
}

pub struct SessionState {
    pub is_authenticated: bool,
    pub field_key: Option<[u8; 32]>,
    pub last_activity: Option<SystemTime>,
    /// Seconds before the session locks. 0 means never lock.
    pub lock_timeout_secs: u64,
}

impl Default for SessionState {
    fn default() -> Self {
        Self {
            is_authenticated: false,
            field_key: None,
            last_activity: None,
            lock_timeout_secs: DEFAULT_LOCK_TIMEOUT_SECS,
        }
    }
}

impl SessionState {
    pub fn clear(&mut self) {
        self.is_authenticated = false;
        self.field_key = None;
        self.last_activity = None;
        self.lock_timeout_secs = DEFAULT_LOCK_TIMEOUT_SECS;
    }
}

pub type DbState = Mutex<Option<Database>>;

pub fn get_app_data_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    app_handle.path().app_data_dir().map_err(|e| e.to_string())
}

pub fn parse_id(id: &str) -> Result<i64, String> {
    id.parse().map_err(|_| "Invalid ID".to_string())
}

pub fn with_db<T>(
    db_state: &State<DbState>,
    f: impl FnOnce(&Database) -> Result<T, String>,
) -> Result<T, String> {
    let guard = db_state.lock().unwrap();
    let db = guard.as_ref().ok_or("Database not initialized")?;
    f(db)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_state_default_is_unauthenticated() {
        let s = SessionState::default();
        assert!(!s.is_authenticated);
        assert!(s.field_key.is_none());
        assert!(s.last_activity.is_none());
        assert_eq!(s.lock_timeout_secs, DEFAULT_LOCK_TIMEOUT_SECS);
    }

    #[test]
    fn session_state_clear_resets_all_fields() {
        let mut s = SessionState {
            is_authenticated: true,
            field_key: Some([1u8; 32]),
            last_activity: Some(SystemTime::now()),
            lock_timeout_secs: 900,
        };
        s.clear();
        assert!(!s.is_authenticated);
        assert!(s.field_key.is_none());
        assert!(s.last_activity.is_none());
        assert_eq!(s.lock_timeout_secs, DEFAULT_LOCK_TIMEOUT_SECS);
    }

    #[test]
    fn default_lock_timeout_is_five_minutes() {
        assert_eq!(DEFAULT_LOCK_TIMEOUT_SECS, 300);
    }

    #[test]
    fn parse_id_valid() {
        assert_eq!(parse_id("42").unwrap(), 42i64);
        assert_eq!(parse_id("1").unwrap(), 1i64);
    }

    #[test]
    fn parse_id_invalid_returns_err() {
        assert!(parse_id("abc").is_err());
        assert!(parse_id("").is_err());
        assert!(parse_id("-1").is_ok()); // negative integers parse fine
    }

    #[test]
    fn db_minutes_to_secs_none_returns_zero() {
        assert_eq!(db_minutes_to_secs(None), 0);
    }

    #[test]
    fn db_minutes_to_secs_some_converts_correctly() {
        assert_eq!(db_minutes_to_secs(Some(5)), 300);
        assert_eq!(db_minutes_to_secs(Some(30)), 1800);
    }

    #[test]
    fn db_minutes_to_secs_negative_clamps_to_zero() {
        assert_eq!(db_minutes_to_secs(Some(-1)), 0);
    }
}
