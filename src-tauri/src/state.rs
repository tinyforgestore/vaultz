use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Manager, State};

use crate::database::Database;

#[derive(Default)]
pub struct SessionState {
    pub is_authenticated: bool,
    pub field_key: Option<[u8; 32]>,
    pub last_activity: Option<SystemTime>,
}

impl SessionState {
    pub fn clear(&mut self) {
        self.is_authenticated = false;
        self.field_key = None;
        self.last_activity = None;
    }
}

pub type DbState = Mutex<Option<Database>>;

pub const LOCK_TIMEOUT: Duration = Duration::from_secs(5 * 60);

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
    use std::time::Duration;

    #[test]
    fn session_state_default_is_unauthenticated() {
        let s = SessionState::default();
        assert!(!s.is_authenticated);
        assert!(s.field_key.is_none());
        assert!(s.last_activity.is_none());
    }

    #[test]
    fn session_state_clear_resets_all_fields() {
        let mut s = SessionState {
            is_authenticated: true,
            field_key: Some([1u8; 32]),
            last_activity: Some(SystemTime::now()),
        };
        s.clear();
        assert!(!s.is_authenticated);
        assert!(s.field_key.is_none());
        assert!(s.last_activity.is_none());
    }

    #[test]
    fn lock_timeout_is_five_minutes() {
        assert_eq!(LOCK_TIMEOUT, Duration::from_secs(300));
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
}
