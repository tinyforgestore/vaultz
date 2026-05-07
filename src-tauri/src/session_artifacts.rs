//! Lifecycle clearing for in-memory session artifacts that must not survive
//! a logout/lock/timeout/destroy. Today this only covers `generated_passwords`,
//! but new short-lived caches should plug in here so every lock site clears
//! consistently.

use tauri::{AppHandle, Emitter, Manager, State};

use crate::constants::GENERATED_PASSWORDS_CHANGED;
use crate::state::DbState;

/// Best-effort clear of all session-scoped artifacts. Errors are intentionally
/// swallowed — these calls run from lock paths where we cannot meaningfully
/// fail the surrounding operation.
pub fn clear_session_artifacts(app: &AppHandle) {
    let db_state: State<DbState> = app.state();
    if let Ok(guard) = db_state.lock() {
        if let Some(db) = guard.as_ref() {
            let _ = db.clear_generated_passwords();
        }
    }
    let _ = app.emit(GENERATED_PASSWORDS_CHANGED, ());
}

#[cfg(test)]
mod tests {
    use crate::database::test_helpers::in_memory_db;

    /// Mirrors the DB-side of `clear_session_artifacts` — exercised against an
    /// in-memory DB since the AppHandle pieces require a Tauri runtime.
    #[test]
    fn db_side_clear_removes_all_generated_password_rows() {
        let db = in_memory_db();
        db.insert_generated_password("ENC:a").unwrap();
        db.insert_generated_password("ENC:b").unwrap();
        assert_eq!(db.list_generated_passwords().unwrap().len(), 2);
        db.clear_generated_passwords().unwrap();
        assert!(db.list_generated_passwords().unwrap().is_empty());
    }
}
