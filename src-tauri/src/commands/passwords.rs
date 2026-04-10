use std::sync::Mutex;
use tauri::State;

use crate::crypto::{decrypt_field, encrypt_field};
use crate::database::{CreatePasswordInput, PasswordEntry, UpdatePasswordInput};
use crate::state::{parse_id, with_db, DbState, SessionState};

fn get_field_key(session: &State<Mutex<SessionState>>) -> Result<[u8; 32], String> {
    session
        .lock()
        .unwrap()
        .field_key
        .ok_or_else(|| "not authenticated".to_string())
}

fn decrypt_entry(key: &[u8; 32], mut entry: PasswordEntry) -> Result<PasswordEntry, String> {
    entry.password = decrypt_field(key, &entry.password)?;
    entry.notes = entry.notes.map(|n| decrypt_field(key, &n)).transpose()?;
    Ok(entry)
}

#[tauri::command]
pub fn get_passwords(
    folder_id: Option<String>,
    db_state: State<DbState>,
    session_state: State<Mutex<SessionState>>,
) -> Result<Vec<PasswordEntry>, String> {
    let key = get_field_key(&session_state)?;
    with_db(&db_state, |db| {
        let entries = match &folder_id {
            Some(fid) => db
                .get_passwords_by_folder(parse_id(fid)?)
                .map_err(|e| e.to_string())?,
            None => db.get_all_passwords().map_err(|e| e.to_string())?,
        };
        entries.into_iter().map(|e| decrypt_entry(&key, e)).collect()
    })
}

#[tauri::command]
pub fn get_password_by_id(
    id: String,
    db_state: State<DbState>,
    session_state: State<Mutex<SessionState>>,
) -> Result<Option<PasswordEntry>, String> {
    let key = get_field_key(&session_state)?;
    with_db(&db_state, |db| {
        db.get_password_by_id(parse_id(&id)?)
            .map_err(|e| e.to_string())?
            .map(|e| decrypt_entry(&key, e))
            .transpose()
    })
}

#[tauri::command]
pub fn create_password(
    input: CreatePasswordInput,
    db_state: State<DbState>,
    session_state: State<Mutex<SessionState>>,
) -> Result<PasswordEntry, String> {
    let key = get_field_key(&session_state)?;
    let enc_input = CreatePasswordInput {
        password: encrypt_field(&key, &input.password)?,
        notes: input.notes.as_deref().map(|n| encrypt_field(&key, n)).transpose()?,
        ..input
    };
    with_db(&db_state, |db| {
        // Enforce free-tier limit of 20 passwords unless a valid license is active.
        if !db.is_license_active() {
            let count = db.count_passwords().map_err(|e| e.to_string())?;
            if count >= super::license::FREE_PASSWORD_LIMIT {
                return Err("LIMIT_REACHED:passwords".to_string());
            }
        }
        let entry = db.create_password(&enc_input).map_err(|e| e.to_string())?;
        decrypt_entry(&key, entry)
    })
}

#[tauri::command]
pub fn update_password(
    id: String,
    mut updates: UpdatePasswordInput,
    db_state: State<DbState>,
    session_state: State<Mutex<SessionState>>,
) -> Result<PasswordEntry, String> {
    let key = get_field_key(&session_state)?;
    if let Some(ref p) = updates.password {
        updates.password = Some(encrypt_field(&key, p)?);
    }
    if let Some(ref n) = updates.notes {
        updates.notes = Some(encrypt_field(&key, n)?);
    }
    with_db(&db_state, |db| {
        let entry = db
            .update_password(parse_id(&id)?, &updates)
            .map_err(|e| e.to_string())?;
        decrypt_entry(&key, entry)
    })
}

#[tauri::command]
pub fn delete_password(id: String, db_state: State<DbState>) -> Result<(), String> {
    with_db(&db_state, |db| {
        db.delete_password(parse_id(&id)?).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_passwords(ids: Vec<String>, db_state: State<DbState>) -> Result<(), String> {
    with_db(&db_state, |db| {
        let id_nums: Vec<i64> = ids.iter().map(|id| parse_id(id)).collect::<Result<_, _>>()?;
        db.delete_passwords(&id_nums).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn search_passwords(
    query: String,
    db_state: State<DbState>,
    session_state: State<Mutex<SessionState>>,
) -> Result<Vec<PasswordEntry>, String> {
    let key = get_field_key(&session_state)?;
    with_db(&db_state, |db| {
        let entries = db.search_passwords(&query).map_err(|e| e.to_string())?;
        entries.into_iter().map(|e| decrypt_entry(&key, e)).collect()
    })
}

#[cfg(test)]
mod tests {
    use crate::crypto::{derive_field_key, encrypt_field};
    use crate::database::{CreatePasswordInput, test_helpers::in_memory_db};

    fn test_key() -> [u8; 32] {
        derive_field_key(b"master", b"salt-16-bytes-ok").unwrap()
    }

    /// Mirrors create_password + get_passwords command logic without State wrappers.
    fn create_encrypted(db: &crate::database::Database, key: &[u8; 32], name: &str, folder_id: &str) -> crate::database::PasswordEntry {
        let enc_password = encrypt_field(key, "secret").unwrap();
        let input = CreatePasswordInput {
            service_name: name.to_string(),
            username: "user".to_string(),
            password: enc_password,
            url: None,
            notes: Some(encrypt_field(key, "my note").unwrap()),
            folder: Some(folder_id.to_string()),
        };
        let entry = db.create_password(&input).unwrap();
        super::decrypt_entry(key, entry).unwrap()
    }

    #[test]
    fn create_and_decrypt_entry() {
        let db = in_memory_db();
        let folder = db.create_folder("F", "f", false).unwrap();
        let key = test_key();
        let entry = create_encrypted(&db, &key, "GitHub", &folder.id);
        assert_eq!(entry.name, "GitHub");
        assert_eq!(entry.password, "secret");
        assert_eq!(entry.notes.as_deref(), Some("my note"));
    }

    #[test]
    fn decrypt_entry_with_wrong_key_fails() {
        let db = in_memory_db();
        let folder = db.create_folder("F", "f", false).unwrap();
        let key = test_key();
        let enc_password = encrypt_field(&key, "secret").unwrap();
        let input = CreatePasswordInput {
            service_name: "svc".to_string(),
            username: "u".to_string(),
            password: enc_password,
            url: None,
            notes: None,
            folder: Some(folder.id),
        };
        let entry = db.create_password(&input).unwrap();
        let wrong_key = [0u8; 32];
        assert!(super::decrypt_entry(&wrong_key, entry).is_err());
    }

    #[test]
    fn get_all_passwords_returns_created() {
        let db = in_memory_db();
        let folder = db.create_folder("F", "f", false).unwrap();
        let key = test_key();
        create_encrypted(&db, &key, "Service A", &folder.id);
        create_encrypted(&db, &key, "Service B", &folder.id);
        let all = db.get_all_passwords().unwrap();
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn search_finds_by_name() {
        let db = in_memory_db();
        let folder = db.create_folder("F", "f", false).unwrap();
        let key = test_key();
        create_encrypted(&db, &key, "GitHub", &folder.id);
        create_encrypted(&db, &key, "Notion", &folder.id);
        let results = db.search_passwords("git").unwrap();
        assert_eq!(results.len(), 1);
        // Decrypt and verify
        let decrypted = super::decrypt_entry(&key, results.into_iter().next().unwrap()).unwrap();
        assert_eq!(decrypted.name, "GitHub");
    }

    #[test]
    fn update_password_re_encrypts_correctly() {
        use crate::database::UpdatePasswordInput;
        let db = in_memory_db();
        let folder = db.create_folder("F", "f", false).unwrap();
        let key = test_key();
        let entry = create_encrypted(&db, &key, "svc", &folder.id);
        let id: i64 = entry.id.parse().unwrap();
        let new_enc = encrypt_field(&key, "newpass").unwrap();
        let updated_raw = db.update_password(id, &UpdatePasswordInput {
            password: Some(new_enc),
            ..Default::default()
        }).unwrap();
        let decrypted = super::decrypt_entry(&key, updated_raw).unwrap();
        assert_eq!(decrypted.password, "newpass");
    }
}
