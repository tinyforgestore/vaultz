use std::sync::Mutex;
use std::time::SystemTime;
use tauri::State;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use password_hash::rand_core::{OsRng, RngCore};

use crate::crypto::{derive_field_key, encrypt_field, verify_password_hash, ENC_PREFIX};
use crate::state::{db_minutes_to_secs, with_db, DbState, SessionState};

fn load_or_create_salt(db_state: &State<DbState>, password: &[u8]) -> Result<[u8; 32], String> {
    let mut fresh_salt = [0u8; 16];
    OsRng.fill_bytes(&mut fresh_salt);
    let fresh_salt_b64 = BASE64.encode(fresh_salt);

    let salt_bytes = with_db(db_state, |db| {
        match db.get_encryption_salt().map_err(|e| e.to_string())? {
            Some(s) => BASE64.decode(&s).map_err(|e| format!("decode salt: {}", e)),
            None => {
                db.store_encryption_salt(&fresh_salt_b64)
                    .map_err(|e| e.to_string())?;
                Ok(fresh_salt.to_vec())
            }
        }
    })?;

    derive_field_key(password, &salt_bytes)
}

fn migrate_encrypt_passwords(db_state: &State<DbState>, key: &[u8; 32]) -> Result<(), String> {
    with_db(db_state, |db| {
        for (id, password, notes) in db
            .get_passwords_for_encryption()
            .map_err(|e| e.to_string())?
        {
            if !password.starts_with(ENC_PREFIX) {
                let enc_password = encrypt_field(key, &password)?;
                let enc_notes = notes
                    .as_deref()
                    .map(|n| {
                        if !n.starts_with(ENC_PREFIX) {
                            encrypt_field(key, n)
                        } else {
                            Ok(n.to_string())
                        }
                    })
                    .transpose()?;
                db.update_encrypted_fields(id, &enc_password, enc_notes.as_deref())
                    .map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    })
}

#[tauri::command]
pub fn login(
    password: String,
    db_state: State<DbState>,
    state: State<Mutex<SessionState>>,
) -> Result<bool, String> {
    if password.is_empty() {
        return Ok(false);
    }

    let stored_hash = with_db(&db_state, |db| {
        db.get_master_password_hash().map_err(|e| e.to_string())
    })?;

    let is_valid = verify_password_hash(&password, &stored_hash)?;

    if is_valid {
        let field_key = load_or_create_salt(&db_state, password.as_bytes())?;
        migrate_encrypt_passwords(&db_state, &field_key)?;

        let timeout_result = with_db(&db_state, |db| {
            db.get_lock_timeout().map_err(|e| e.to_string())
        });
        let lock_timeout_secs = match timeout_result {
            Ok(Some(minutes)) => db_minutes_to_secs(Some(minutes)),
            Ok(None) => 0, // user chose "Never"
            Err(_) => crate::state::DEFAULT_LOCK_TIMEOUT_SECS, // DB error → safe default
        };

        let mut session = state.lock().unwrap();
        session.is_authenticated = true;
        session.field_key = Some(field_key);
        session.last_activity = Some(SystemTime::now());
        session.lock_timeout_secs = lock_timeout_secs;
    }

    Ok(is_valid)
}

#[tauri::command]
pub fn logout(state: State<Mutex<SessionState>>) {
    state.lock().unwrap().clear();
}

#[tauri::command]
pub fn is_authenticated(state: State<Mutex<SessionState>>) -> bool {
    state.lock().unwrap().is_authenticated
}

#[tauri::command]
pub fn update_activity(state: State<Mutex<SessionState>>) {
    let mut session = state.lock().unwrap();
    if session.is_authenticated {
        session.last_activity = Some(SystemTime::now());
    }
}

#[tauri::command]
pub fn check_session_timeout(state: State<Mutex<SessionState>>) -> bool {
    let mut session = state.lock().unwrap();
    // lock_timeout_secs == 0 means "never lock"
    if session.lock_timeout_secs == 0 {
        return false;
    }
    let timeout = std::time::Duration::from_secs(session.lock_timeout_secs);
    if let Some(last_activity) = session.last_activity {
        if let Ok(elapsed) = SystemTime::now().duration_since(last_activity) {
            if elapsed > timeout {
                session.clear();
                return true;
            }
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use std::time::{Duration, SystemTime};

    use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

    use crate::crypto::{decrypt_field, derive_field_key, encrypt_field, hash_password, verify_password_hash, ENC_PREFIX};
    use crate::database::test_helpers::in_memory_db;
    use crate::database::CreatePasswordInput;
    use crate::state::{SessionState, DEFAULT_LOCK_TIMEOUT_SECS};

    // --- Session timeout logic (mirrors check_session_timeout) ---

    fn is_timed_out(session: &mut SessionState) -> bool {
        if session.lock_timeout_secs == 0 {
            return false;
        }
        let timeout = Duration::from_secs(session.lock_timeout_secs);
        if let Some(last_activity) = session.last_activity {
            if let Ok(elapsed) = SystemTime::now().duration_since(last_activity) {
                if elapsed > timeout {
                    session.clear();
                    return true;
                }
            }
        }
        false
    }

    #[test]
    fn timeout_clears_session_when_expired() {
        let lock_timeout = Duration::from_secs(DEFAULT_LOCK_TIMEOUT_SECS);
        let mut session = SessionState {
            is_authenticated: true,
            field_key: Some([1u8; 32]),
            last_activity: Some(SystemTime::now() - lock_timeout - Duration::from_secs(1)),
            lock_timeout_secs: DEFAULT_LOCK_TIMEOUT_SECS,
        };
        assert!(is_timed_out(&mut session));
        assert!(!session.is_authenticated);
        assert!(session.field_key.is_none());
    }

    #[test]
    fn timeout_does_not_clear_when_still_valid() {
        let mut session = SessionState {
            is_authenticated: true,
            field_key: Some([1u8; 32]),
            last_activity: Some(SystemTime::now()),
            lock_timeout_secs: DEFAULT_LOCK_TIMEOUT_SECS,
        };
        assert!(!is_timed_out(&mut session));
        assert!(session.is_authenticated);
    }

    #[test]
    fn timeout_returns_false_when_no_activity() {
        let mut session = SessionState::default();
        assert!(!is_timed_out(&mut session));
    }

    #[test]
    fn timeout_returns_false_when_lock_timeout_secs_is_zero() {
        let mut session = SessionState {
            is_authenticated: true,
            field_key: Some([1u8; 32]),
            // Activity set to far in the past — should still not time out
            last_activity: Some(SystemTime::now() - Duration::from_secs(99999)),
            lock_timeout_secs: 0,
        };
        assert!(!is_timed_out(&mut session));
        assert!(session.is_authenticated);
    }

    // --- load_or_create_salt logic (mirrors the DB helper) ---

    #[test]
    fn salt_is_created_when_missing() {
        let db = in_memory_db();
        db.store_master_password_hash("h").unwrap();
        assert!(db.get_encryption_salt().unwrap().is_none());
        // Simulate creating a salt
        let mut salt = [0u8; 16];
        salt[0] = 7; // deterministic for test
        db.store_encryption_salt(&BASE64.encode(salt)).unwrap();
        let stored = db.get_encryption_salt().unwrap().unwrap();
        assert!(!stored.is_empty());
    }

    #[test]
    fn existing_salt_is_reused() {
        let db = in_memory_db();
        db.store_master_password_hash("h").unwrap();
        db.store_encryption_salt("firstsalt").unwrap();
        db.store_encryption_salt("firstsalt").unwrap(); // idempotent
        assert_eq!(db.get_encryption_salt().unwrap().unwrap(), "firstsalt");
    }

    // --- migrate_encrypt_passwords logic ---

    #[test]
    fn plaintext_passwords_get_encrypted_during_migration() {
        let db = in_memory_db();
        let folder = db.create_folder("F", "f", false).unwrap();
        let fid = folder.id.clone();
        db.create_password(&CreatePasswordInput {
            service_name: "svc".to_string(),
            username: "u".to_string(),
            password: "plaintext".to_string(),
            url: None,
            notes: None,
            folder: Some(fid),
        }).unwrap();

        let salt = b"salt-16-bytes-ok";
        let key = derive_field_key(b"master", salt).unwrap();

        // Simulate migration
        for (id, password, notes) in db.get_passwords_for_encryption().unwrap() {
            if !password.starts_with(ENC_PREFIX) {
                let enc = encrypt_field(&key, &password).unwrap();
                db.update_encrypted_fields(id, &enc, notes.as_deref()).unwrap();
            }
        }

        let rows = db.get_passwords_for_encryption().unwrap();
        assert!(rows[0].1.starts_with(ENC_PREFIX));
        let decrypted = decrypt_field(&key, &rows[0].1).unwrap();
        assert_eq!(decrypted, "plaintext");
    }

    #[test]
    fn already_encrypted_passwords_are_not_double_encrypted() {
        let db = in_memory_db();
        let folder = db.create_folder("F", "f", false).unwrap();
        let salt = b"salt-16-bytes-ok";
        let key = derive_field_key(b"master", salt).unwrap();
        let enc = encrypt_field(&key, "alreadyenc").unwrap();

        let fid = folder.id.clone();
        db.create_password(&CreatePasswordInput {
            service_name: "svc".to_string(),
            username: "u".to_string(),
            password: enc.clone(),
            url: None,
            notes: None,
            folder: Some(fid),
        }).unwrap();

        // Migration skips already-encrypted
        for (id, password, notes) in db.get_passwords_for_encryption().unwrap() {
            if !password.starts_with(ENC_PREFIX) {
                let new_enc = encrypt_field(&key, &password).unwrap();
                db.update_encrypted_fields(id, &new_enc, notes.as_deref()).unwrap();
            }
        }

        let rows = db.get_passwords_for_encryption().unwrap();
        assert_eq!(rows[0].1, enc); // unchanged
    }

    // --- login logic ---

    #[test]
    fn login_validates_hash_correctly() {
        let hash = hash_password("correct-pass").unwrap();
        assert!(verify_password_hash("correct-pass", &hash).unwrap());
        assert!(!verify_password_hash("wrong-pass", &hash).unwrap());
    }
}
