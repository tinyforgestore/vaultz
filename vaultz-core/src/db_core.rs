use argon2::{Argon2, PasswordVerifier};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rusqlite::Connection;

use crate::crypto::{derive_key, KEY_LEN};
use crate::models::Entry;

pub const ENTRY_COLS: &str = "
    SELECT p.id, p.name, p.username, p.email, p.password, p.website, p.notes,
           f.name, p.is_favorite
    FROM passwords p JOIN folders f ON p.folder_id = f.id
";

pub fn row_to_entry(r: &rusqlite::Row<'_>) -> rusqlite::Result<Entry> {
    Ok(Entry {
        id: r.get(0)?,
        name: r.get(1)?,
        username: r.get(2)?,
        email: r.get(3)?,
        password: r.get(4)?,
        website: r.get(5)?,
        notes: r.get(6)?,
        folder_name: r.get(7)?,
        is_favorite: r.get::<_, i64>(8)? != 0,
    })
}

pub fn find_entries(conn: &Connection, name: &str) -> Vec<Entry> {
    let exact_sql = format!(
        "{} WHERE LOWER(p.name) = LOWER(?1) ORDER BY p.name",
        ENTRY_COLS
    );
    let mut stmt = conn.prepare(&exact_sql).expect("prepare");
    let exact: Vec<Entry> = stmt
        .query_map([name], row_to_entry)
        .expect("query")
        .filter_map(|r| r.ok())
        .collect();
    if !exact.is_empty() {
        return exact;
    }

    let fuzzy_sql = format!(
        "{} WHERE INSTR(LOWER(p.name), LOWER(?1)) > 0 ORDER BY p.name",
        ENTRY_COLS
    );
    let mut stmt = conn.prepare(&fuzzy_sql).expect("prepare");
    stmt.query_map([name], row_to_entry)
        .expect("query")
        .filter_map(|r| r.ok())
        .collect()
}

pub fn verify_and_derive_key(conn: &Connection, password: &str) -> Result<[u8; KEY_LEN], String> {
    let (stored_hash, salt_b64): (String, Option<String>) = conn
        .query_row(
            "SELECT password_hash, encryption_salt FROM master_password LIMIT 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|_| "Vault not initialized".to_string())?;

    let parsed = password_hash::PasswordHash::new(&stored_hash)
        .map_err(|e| format!("Invalid hash in database: {}", e))?;
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .map_err(|_| "Wrong master password".to_string())?;

    let salt_b64 = salt_b64.ok_or_else(|| "Encryption salt missing".to_string())?;
    let salt = BASE64
        .decode(&salt_b64)
        .map_err(|e| format!("Invalid salt: {}", e))?;

    derive_key(password.as_bytes(), &salt)
}
