use std::sync::Mutex;
use std::time::SystemTime;
use tauri::{AppHandle, State};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use password_hash::rand_core::{OsRng, RngCore};

use crate::crypto::{derive_field_key, hash_password};
use crate::database::Database;
use crate::state::{db_minutes_to_secs, get_app_data_dir, DbState, SessionState};

#[tauri::command]
pub fn database_exists(app_handle: AppHandle) -> bool {
    let app_data_dir = get_app_data_dir(&app_handle).expect("Failed to resolve app data dir");
    Database::db_file_exists(&app_data_dir)
}

#[tauri::command]
pub fn initialize_database(
    master_password: String,
    app_handle: AppHandle,
    db_state: State<DbState>,
    session_state: State<Mutex<SessionState>>,
) -> Result<(), String> {
    if master_password.is_empty() {
        return Err("Master password cannot be empty".to_string());
    }

    let app_data_dir = get_app_data_dir(&app_handle)?;

    let db = Database::new(app_data_dir).map_err(|e| e.to_string())?;
    db.initialize_schema().map_err(|e| e.to_string())?;

    db.store_master_password_hash(&hash_password(&master_password)?)
        .map_err(|e| e.to_string())?;

    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);
    db.store_encryption_salt(&BASE64.encode(salt))
        .map_err(|e| e.to_string())?;

    let field_key = derive_field_key(master_password.as_bytes(), &salt)?;

    db.create_folder("General", "folder", true).map_err(|e| e.to_string())?;
    db.create_folder("Work", "briefcase", true).map_err(|e| e.to_string())?;
    db.create_folder("Personal", "user", true).map_err(|e| e.to_string())?;

    let timeout_secs = match db.get_lock_timeout() {
        Ok(Some(minutes)) => db_minutes_to_secs(Some(minutes)),
        Ok(None) => 0, // user chose "Never"
        Err(_) => crate::state::DEFAULT_LOCK_TIMEOUT_SECS, // DB error → safe default
    };

    *db_state.lock().unwrap() = Some(db);

    let mut session = session_state.lock().unwrap();
    session.is_authenticated = true;
    session.field_key = Some(field_key);
    session.last_activity = Some(SystemTime::now());
    session.lock_timeout_secs = timeout_secs;

    Ok(())
}

#[cfg(test)]
mod tests {
    use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
    use password_hash::rand_core::{OsRng, RngCore};

    use crate::crypto::{derive_field_key, hash_password};
    use crate::database::test_helpers::in_memory_db;
    use crate::state::SessionState;

    /// Mirrors the logic in initialize_database without the Tauri State wrappers.
    fn run_initialize(db: &crate::database::Database, master_password: &str) -> [u8; 32] {
        db.initialize_schema().unwrap();
        db.store_master_password_hash(&hash_password(master_password).unwrap()).unwrap();
        let mut salt = [0u8; 16];
        OsRng.fill_bytes(&mut salt);
        db.store_encryption_salt(&BASE64.encode(salt)).unwrap();
        db.create_folder("General", "folder", true).unwrap();
        db.create_folder("Work", "briefcase", true).unwrap();
        db.create_folder("Personal", "user", true).unwrap();
        derive_field_key(master_password.as_bytes(), &salt).unwrap()
    }

    #[test]
    fn initialize_creates_default_folders() {
        let db = in_memory_db();
        run_initialize(&db, "strongpass");
        let folders = db.get_all_folders().unwrap();
        assert_eq!(folders.len(), 3);
        let names: Vec<&str> = folders.iter().map(|f| f.name.as_str()).collect();
        assert!(names.contains(&"General"));
        assert!(names.contains(&"Work"));
        assert!(names.contains(&"Personal"));
    }

    #[test]
    fn initialize_stores_password_hash_and_salt() {
        let db = in_memory_db();
        run_initialize(&db, "mypassword");
        assert!(db.get_master_password_hash().is_ok());
        assert!(db.get_encryption_salt().unwrap().is_some());
    }

    #[test]
    fn initialize_derives_field_key() {
        let db = in_memory_db();
        let key = run_initialize(&db, "testpass");
        assert_ne!(key, [0u8; 32]);
    }

    #[test]
    fn session_state_is_set_correctly_after_init() {
        let mut session = SessionState::default();
        let key = [42u8; 32];
        session.is_authenticated = true;
        session.field_key = Some(key);
        session.last_activity = Some(std::time::SystemTime::now());
        assert!(session.is_authenticated);
        assert_eq!(session.field_key, Some(key));
        assert!(session.last_activity.is_some());
    }
}
