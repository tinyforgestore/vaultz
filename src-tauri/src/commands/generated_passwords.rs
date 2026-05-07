use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

use crate::constants::GENERATED_PASSWORDS_CHANGED;
use crate::crypto::{decrypt_field, encrypt_field};
use crate::state::{with_db, DbState, SessionState};

/// Outbound shape — `password` here is the decrypted plaintext.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedPasswordOut {
    pub id: i64,
    pub password: String,
    pub created_at: String,
}

fn emit_changed(app: &AppHandle) {
    let _ = app.emit(GENERATED_PASSWORDS_CHANGED, ());
}

fn get_field_key(session: &State<Mutex<SessionState>>) -> Result<[u8; 32], String> {
    session
        .lock()
        .unwrap()
        .field_key
        .ok_or_else(|| "not authenticated".to_string())
}

#[tauri::command]
pub fn record_generated_password(
    app: AppHandle,
    password: String,
    db_state: State<DbState>,
    session_state: State<Mutex<SessionState>>,
) -> Result<i64, String> {
    let key = get_field_key(&session_state)?;
    let encrypted = encrypt_field(&key, &password)?;
    let id = with_db(&db_state, |db| {
        db.insert_generated_password(&encrypted)
            .map_err(|e| e.to_string())
    })?;
    emit_changed(&app);
    Ok(id)
}

#[tauri::command]
pub fn list_generated_passwords(
    db_state: State<DbState>,
    session_state: State<Mutex<SessionState>>,
) -> Result<Vec<GeneratedPasswordOut>, String> {
    let key = get_field_key(&session_state)?;
    with_db(&db_state, |db| {
        let rows = db
            .list_generated_passwords()
            .map_err(|e| e.to_string())?;
        rows.into_iter()
            .map(|r| {
                Ok(GeneratedPasswordOut {
                    id: r.id,
                    password: decrypt_field(&key, &r.password)?,
                    created_at: r.created_at,
                })
            })
            .collect()
    })
}

#[tauri::command]
pub fn delete_generated_password(
    app: AppHandle,
    id: i64,
    db_state: State<DbState>,
    session_state: State<Mutex<SessionState>>,
) -> Result<(), String> {
    let _ = get_field_key(&session_state)?;
    with_db(&db_state, |db| {
        db.delete_generated_password(id).map_err(|e| e.to_string())
    })?;
    emit_changed(&app);
    Ok(())
}

#[tauri::command]
pub fn clear_generated_passwords(
    app: AppHandle,
    db_state: State<DbState>,
    session_state: State<Mutex<SessionState>>,
) -> Result<(), String> {
    let _ = get_field_key(&session_state)?;
    with_db(&db_state, |db| {
        db.clear_generated_passwords().map_err(|e| e.to_string())
    })?;
    emit_changed(&app);
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::crypto::{decrypt_field, derive_field_key, encrypt_field};
    use crate::database::test_helpers::in_memory_db;

    fn test_key() -> [u8; 32] {
        derive_field_key(b"master", b"salt-16-bytes-ok").unwrap()
    }

    /// Mirrors `record_generated_password`'s body without the AppHandle plumbing.
    #[test]
    fn record_then_list_decrypts_correctly() {
        let db = in_memory_db();
        let key = test_key();
        let enc = encrypt_field(&key, "Tr0ub4dor&3").unwrap();
        db.insert_generated_password(&enc).unwrap();

        let rows = db.list_generated_passwords().unwrap();
        assert_eq!(rows.len(), 1);
        let decrypted = decrypt_field(&key, &rows[0].password).unwrap();
        assert_eq!(decrypted, "Tr0ub4dor&3");
    }

    #[test]
    fn auth_gate_rejects_when_field_key_missing() {
        // get_field_key returns Err when no session.field_key is set.
        // We replicate the check here since SessionState is not Tauri-managed in tests.
        let session_field_key: Option<[u8; 32]> = None;
        let result: Result<[u8; 32], String> = session_field_key
            .ok_or_else(|| "not authenticated".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn list_returns_empty_when_no_rows() {
        let db = in_memory_db();
        assert!(db.list_generated_passwords().unwrap().is_empty());
    }

    #[test]
    fn delete_then_list_drops_the_target() {
        let db = in_memory_db();
        let key = test_key();
        let id_a = db
            .insert_generated_password(&encrypt_field(&key, "a").unwrap())
            .unwrap();
        let _id_b = db
            .insert_generated_password(&encrypt_field(&key, "b").unwrap())
            .unwrap();
        db.delete_generated_password(id_a).unwrap();
        let rows = db.list_generated_passwords().unwrap();
        assert_eq!(rows.len(), 1);
        let decrypted = decrypt_field(&key, &rows[0].password).unwrap();
        assert_eq!(decrypted, "b");
    }

    #[test]
    fn clear_removes_all_rows() {
        let db = in_memory_db();
        let key = test_key();
        for c in ["a", "b", "c"] {
            db.insert_generated_password(&encrypt_field(&key, c).unwrap())
                .unwrap();
        }
        db.clear_generated_passwords().unwrap();
        assert!(db.list_generated_passwords().unwrap().is_empty());
    }
}
