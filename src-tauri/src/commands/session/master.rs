use std::sync::Mutex;
use tauri::State;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

use crate::crypto::{decrypt_field, derive_field_key, encrypt_field, hash_password, verify_password_hash};
use crate::state::{with_db, DbState, SessionState};

#[tauri::command]
pub fn verify_master_password(
    password: String,
    db_state: State<DbState>,
) -> Result<bool, String> {
    with_db(&db_state, |db| {
        let stored_hash = db.get_master_password_hash().map_err(|e| e.to_string())?;
        verify_password_hash(&password, &stored_hash)
    })
}

#[tauri::command]
pub fn change_master_password(
    current_password: String,
    new_password: String,
    db_state: State<DbState>,
    session_state: State<Mutex<SessionState>>,
) -> Result<bool, String> {
    let (stored_hash, salt_b64) = with_db(&db_state, |db| {
        let hash = db.get_master_password_hash().map_err(|e| e.to_string())?;
        let salt = db
            .get_encryption_salt()
            .map_err(|e| e.to_string())
            .and_then(|s| s.ok_or_else(|| "encryption salt missing".to_string()))?;
        Ok((hash, salt))
    })?;

    if !verify_password_hash(&current_password, &stored_hash)? {
        return Ok(false);
    }

    let salt = BASE64.decode(&salt_b64).map_err(|e| format!("decode salt: {}", e))?;

    let old_key = derive_field_key(current_password.as_bytes(), &salt)?;
    let new_key = derive_field_key(new_password.as_bytes(), &salt)?;

    with_db(&db_state, |db| {
        for (id, password, notes) in db
            .get_passwords_for_encryption()
            .map_err(|e| e.to_string())?
        {
            let enc_password = encrypt_field(&new_key, &decrypt_field(&old_key, &password)?)?;
            let enc_notes = notes
                .as_deref()
                .map(|n| encrypt_field(&new_key, &decrypt_field(&old_key, n)?))
                .transpose()?;
            db.update_encrypted_fields(id, &enc_password, enc_notes.as_deref())
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    })?;

    with_db(&db_state, |db| {
        db.update_master_password_hash(&hash_password(&new_password)?)
            .map_err(|e| e.to_string())
    })?;

    session_state.lock().unwrap().field_key = Some(new_key);

    Ok(true)
}

#[cfg(test)]
mod tests {
    use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

    use crate::crypto::{decrypt_field, derive_field_key, encrypt_field, hash_password, verify_password_hash, ENC_PREFIX};
    use crate::database::{test_helpers::in_memory_db, CreatePasswordInput};

    fn setup_db_with_password(master: &str, salt: &[u8]) -> crate::database::Database {
        let db = in_memory_db();
        db.store_master_password_hash(&hash_password(master).unwrap()).unwrap();
        db.store_encryption_salt(&BASE64.encode(salt)).unwrap();
        db
    }

    /// Mirrors verify_master_password logic without State wrappers.
    fn verify(db: &crate::database::Database, password: &str) -> bool {
        let hash = db.get_master_password_hash().unwrap();
        verify_password_hash(password, &hash).unwrap()
    }

    /// Mirrors change_master_password logic without State wrappers.
    fn change_password(
        db: &crate::database::Database,
        current: &str,
        new: &str,
        salt: &[u8],
    ) -> bool {
        let hash = db.get_master_password_hash().unwrap();
        if !verify_password_hash(current, &hash).unwrap() {
            return false;
        }
        let old_key = derive_field_key(current.as_bytes(), salt).unwrap();
        let new_key = derive_field_key(new.as_bytes(), salt).unwrap();
        for (id, password, notes) in db.get_passwords_for_encryption().unwrap() {
            let enc_pw = encrypt_field(&new_key, &decrypt_field(&old_key, &password).unwrap()).unwrap();
            let enc_notes = notes
                .as_deref()
                .map(|n| encrypt_field(&new_key, &decrypt_field(&old_key, n).unwrap()))
                .transpose()
                .unwrap();
            db.update_encrypted_fields(id, &enc_pw, enc_notes.as_deref()).unwrap();
        }
        db.update_master_password_hash(&hash_password(new).unwrap()).unwrap();
        true
    }

    #[test]
    fn verify_correct_password_returns_true() {
        let salt = b"salt-16-bytes-ok";
        let db = setup_db_with_password("correct", salt);
        assert!(verify(&db, "correct"));
    }

    #[test]
    fn verify_wrong_password_returns_false() {
        let salt = b"salt-16-bytes-ok";
        let db = setup_db_with_password("correct", salt);
        assert!(!verify(&db, "wrong"));
    }

    #[test]
    fn change_password_wrong_current_returns_false() {
        let salt = b"salt-16-bytes-ok";
        let db = setup_db_with_password("correct", salt);
        assert!(!change_password(&db, "wrong", "newpass", salt));
    }

    #[test]
    fn change_password_updates_hash() {
        let salt = b"salt-16-bytes-ok";
        let db = setup_db_with_password("old", salt);
        assert!(change_password(&db, "old", "new", salt));
        assert!(verify(&db, "new"));
        assert!(!verify(&db, "old"));
    }

    #[test]
    fn change_password_re_encrypts_all_entries() {
        let salt = b"salt-16-bytes-ok";
        let db = setup_db_with_password("old", salt);
        let old_key = derive_field_key(b"old", salt).unwrap();
        let new_key = derive_field_key(b"new", salt).unwrap();
        let folder = db.create_folder("F", "f", false).unwrap();
        db.create_password(&CreatePasswordInput {
            service_name: "svc".to_string(),
            username: "u".to_string(),
            password: encrypt_field(&old_key, "secret").unwrap(),
            url: None,
            notes: Some(encrypt_field(&old_key, "note").unwrap()),
            folder: Some(folder.id),
        }).unwrap();

        assert!(change_password(&db, "old", "new", salt));

        let rows = db.get_passwords_for_encryption().unwrap();
        assert!(rows[0].1.starts_with(ENC_PREFIX));
        assert_eq!(decrypt_field(&new_key, &rows[0].1).unwrap(), "secret");
        assert_eq!(decrypt_field(&new_key, rows[0].2.as_deref().unwrap()).unwrap(), "note");
        // Old key no longer works
        assert!(decrypt_field(&old_key, &rows[0].1).is_err());
    }

    #[test]
    fn change_password_with_no_entries_succeeds() {
        let salt = b"salt-16-bytes-ok";
        let db = setup_db_with_password("old", salt);
        assert!(change_password(&db, "old", "new", salt));
        assert!(verify(&db, "new"));
    }
}
