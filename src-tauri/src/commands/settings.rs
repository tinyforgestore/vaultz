use std::sync::Mutex;
use tauri::State;

use crate::state::{db_minutes_to_secs, with_db, DbState, SessionState};

#[tauri::command]
pub fn get_lock_timeout(
    db_state: State<'_, DbState>,
    session: State<'_, Mutex<SessionState>>,
) -> Result<Option<i64>, String> {
    {
        let session_guard = session.lock().map_err(|e| e.to_string())?;
        if !session_guard.is_authenticated {
            return Err("Not authenticated".to_string());
        }
    }
    with_db(&db_state, |db| {
        db.get_lock_timeout().map_err(|e| e.to_string())
    })
}

// IMPORTANT: These values must match the <Select.Item> options in SettingsPage/index.tsx.
// Adding a new option requires updating BOTH the Rust allowlist AND the frontend dropdown.
// Allow: None (Never), 1, 5, 15, 30 minutes
const ALLOWED_MINUTES: &[i64] = &[1, 5, 15, 30];

#[tauri::command]
pub fn set_lock_timeout(
    minutes: Option<i64>,
    db_state: State<'_, DbState>,
    session: State<'_, Mutex<SessionState>>,
) -> Result<(), String> {
    {
        let session_guard = session.lock().map_err(|e| e.to_string())?;
        if !session_guard.is_authenticated {
            return Err("Not authenticated".to_string());
        }
    }

    if let Some(m) = minutes {
        if !ALLOWED_MINUTES.contains(&m) {
            return Err(format!("Invalid lock timeout: {}", m));
        }
    }

    with_db(&db_state, |db| {
        db.set_lock_timeout(minutes).map_err(|e| e.to_string())
    })?;

    // Apply immediately so it takes effect without requiring a re-login.
    session.lock().map_err(|e| e.to_string())?.lock_timeout_secs = db_minutes_to_secs(minutes);

    Ok(())
}
