use std::sync::Mutex;

use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit, Nonce};
use password_hash::rand_core::{OsRng, RngCore};
use tauri::{AppHandle, State};

use crate::crypto::derive_field_key;
use crate::database::{Database, DB_FILENAME};
use crate::state::{get_app_data_dir, with_db, DbState, SessionState};

const MAGIC: &[u8] = b"PMVAULT1";
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;
const HEADER_LEN: usize = MAGIC.len() + SALT_LEN + NONCE_LEN;

#[tauri::command]
pub fn export_vault(
    passphrase: String,
    path: String,
    db_state: State<DbState>,
) -> Result<(), String> {
    eprintln!("[export_vault] starting export to: {}", path);

    let temp_path = format!("{}.tmp", path);

    let _ = std::fs::remove_file(&temp_path); // clean up any stale temp from a previous failed run

    eprintln!("[export_vault] step 1: VACUUM INTO {}", temp_path);
    with_db(&db_state, |db| {
        db.export_to_path(&temp_path)
            .map_err(|e| format!("VACUUM INTO failed: {}", e))
    })?;

    eprintln!("[export_vault] step 2: reading temp file");
    let plaintext = std::fs::read(&temp_path)
        .map_err(|e| format!("read temp file: {}", e))?;
    let _ = std::fs::remove_file(&temp_path);

    eprintln!("[export_vault] step 3: generating salt/nonce, deriving key");
    let mut salt = [0u8; SALT_LEN];
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce_bytes);

    let key = derive_field_key(passphrase.as_bytes(), &salt)?;

    eprintln!("[export_vault] step 4: encrypting ({} bytes plaintext)", plaintext.len());
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("cipher init: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_ref())
        .map_err(|e| format!("encryption failed: {}", e))?;

    eprintln!("[export_vault] step 5: writing output file");
    let mut output = Vec::with_capacity(HEADER_LEN + ciphertext.len());
    output.extend_from_slice(MAGIC);
    output.extend_from_slice(&salt);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    std::fs::write(&path, &output).map_err(|e| format!("write output file: {}", e))?;
    eprintln!("[export_vault] done");
    Ok(())
}

#[tauri::command]
pub fn destroy_vault(
    app_handle: AppHandle,
    db_state: State<DbState>,
    session_state: State<Mutex<SessionState>>,
) -> Result<(), String> {
    eprintln!("[destroy_vault] clearing session and closing database");
    session_state.lock().unwrap().clear();
    *db_state.lock().unwrap() = None;

    let app_data_dir = get_app_data_dir(&app_handle)?;

    std::fs::remove_file(app_data_dir.join(DB_FILENAME))
        .map_err(|e| format!("delete database: {}", e))?;
    let _ = std::fs::remove_file(app_data_dir.join(format!("{}-wal", DB_FILENAME)));
    let _ = std::fs::remove_file(app_data_dir.join(format!("{}-shm", DB_FILENAME)));

    eprintln!("[destroy_vault] done");
    Ok(())
}

#[tauri::command]
pub fn import_vault(
    passphrase: String,
    path: String,
    app_handle: AppHandle,
    db_state: State<DbState>,
    session_state: State<Mutex<SessionState>>,
) -> Result<(), String> {
    eprintln!("[import_vault] starting import from: {}", path);

    // 1. Read and validate file
    let data = std::fs::read(&path).map_err(|e| format!("read file: {}", e))?;
    eprintln!("[import_vault] file size: {} bytes", data.len());

    if data.len() < HEADER_LEN {
        return Err("File too small to be a valid vault".to_string());
    }
    if &data[..MAGIC.len()] != MAGIC {
        return Err("Not a valid .pmvault file".to_string());
    }

    // 2. Parse header and decrypt
    let salt = &data[MAGIC.len()..MAGIC.len() + SALT_LEN];
    let nonce_bytes = &data[MAGIC.len() + SALT_LEN..HEADER_LEN];
    let ciphertext = &data[HEADER_LEN..];

    eprintln!("[import_vault] deriving key and decrypting");
    let key = derive_field_key(passphrase.as_bytes(), salt)?;

    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("cipher init: {}", e))?;
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Decryption failed — wrong passphrase or corrupted file".to_string())?;

    // 3. Validate SQLite magic
    if plaintext.len() < 16 || &plaintext[..16] != b"SQLite format 3\0" {
        return Err("Decrypted data is not a valid SQLite database".to_string());
    }
    eprintln!("[import_vault] decryption OK ({} bytes)", plaintext.len());

    // 4. Write database to app data dir
    let app_data_dir = get_app_data_dir(&app_handle)?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| format!("create dir: {}", e))?;
    let db_path = app_data_dir.join(DB_FILENAME);
    std::fs::write(&db_path, &plaintext).map_err(|e| format!("write database: {}", e))?;
    eprintln!("[import_vault] wrote database to {:?}", db_path);

    // 5. Open the new database, run migrations, and replace state
    let new_db = Database::new(app_data_dir).map_err(|e| format!("open database: {}", e))?;
    new_db.run_migrations().map_err(|e| format!("run migrations: {}", e))?;

    *db_state.lock().unwrap() = Some(new_db);
    session_state.lock().unwrap().clear();

    eprintln!("[import_vault] done");
    Ok(())
}

#[cfg(test)]
mod tests {
    use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit, Nonce};
    use password_hash::rand_core::{OsRng, RngCore};

    use crate::crypto::derive_field_key;

    use super::{HEADER_LEN, MAGIC, NONCE_LEN, SALT_LEN};

    /// Encodes a byte slice in pmvault format (mirrors export_vault logic).
    fn vault_encode(passphrase: &str, plaintext: &[u8]) -> Vec<u8> {
        let mut salt = [0u8; SALT_LEN];
        let mut nonce_bytes = [0u8; NONCE_LEN];
        OsRng.fill_bytes(&mut salt);
        OsRng.fill_bytes(&mut nonce_bytes);
        let key = derive_field_key(passphrase.as_bytes(), &salt).unwrap();
        let cipher = Aes256Gcm::new_from_slice(&key).unwrap();
        let nonce = Nonce::from_slice(&nonce_bytes);
        let ciphertext = cipher.encrypt(nonce, plaintext).unwrap();
        let mut out = Vec::with_capacity(HEADER_LEN + ciphertext.len());
        out.extend_from_slice(MAGIC);
        out.extend_from_slice(&salt);
        out.extend_from_slice(&nonce_bytes);
        out.extend_from_slice(&ciphertext);
        out
    }

    /// Decodes a pmvault-encoded buffer (mirrors import_vault validation logic).
    fn vault_decode(passphrase: &str, data: &[u8]) -> Result<Vec<u8>, String> {
        if data.len() < HEADER_LEN {
            return Err("File too small".to_string());
        }
        if &data[..MAGIC.len()] != MAGIC {
            return Err("Invalid magic".to_string());
        }
        let salt = &data[MAGIC.len()..MAGIC.len() + SALT_LEN];
        let nonce_bytes = &data[MAGIC.len() + SALT_LEN..HEADER_LEN];
        let ciphertext = &data[HEADER_LEN..];
        let key = derive_field_key(passphrase.as_bytes(), salt)?;
        let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
        let nonce = Nonce::from_slice(nonce_bytes);
        cipher.decrypt(nonce, ciphertext).map_err(|_| "decryption failed".to_string())
    }

    #[test]
    fn encode_decode_round_trip() {
        let plaintext = b"hello vault world";
        let encoded = vault_encode("passphrase", plaintext);
        let decoded = vault_decode("passphrase", &encoded).unwrap();
        assert_eq!(decoded, plaintext);
    }

    #[test]
    fn wrong_passphrase_fails_decryption() {
        let encoded = vault_encode("correct", b"data");
        assert!(vault_decode("wrong", &encoded).is_err());
    }

    #[test]
    fn wrong_magic_is_rejected() {
        let mut encoded = vault_encode("pass", b"data");
        encoded[0] = 0xFF; // corrupt magic
        assert!(vault_decode("pass", &encoded).is_err());
    }

    #[test]
    fn too_small_file_is_rejected() {
        let data = vec![0u8; HEADER_LEN - 1];
        assert!(vault_decode("pass", &data).is_err());
    }

    #[test]
    fn header_constants_are_correct() {
        assert_eq!(MAGIC, b"PMVAULT1");
        assert_eq!(SALT_LEN, 16);
        assert_eq!(NONCE_LEN, 12);
        assert_eq!(HEADER_LEN, MAGIC.len() + SALT_LEN + NONCE_LEN);
    }

    #[test]
    fn each_encode_produces_unique_ciphertext() {
        let plaintext = b"same input";
        let a = vault_encode("pass", plaintext);
        let b = vault_encode("pass", plaintext);
        // Random salt + nonce means output differs
        assert_ne!(a, b);
    }
}
