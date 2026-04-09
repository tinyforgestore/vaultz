// CLI-specific database connection management
// Keeps process::exit() — this is CLI glue, not library code.

use std::{env, process};

use rusqlite::Connection;

use crate::constants::DB_RELATIVE_PATH;
use crate::input::get_master_password;
use vaultz_core::crypto::KEY_LEN;
use vaultz_core::db_core::verify_and_derive_key;

pub fn db_path() -> std::path::PathBuf {
    let home = env::var("HOME").unwrap_or_else(|_| {
        eprintln!("HOME not set");
        process::exit(1);
    });
    std::path::PathBuf::from(home).join(DB_RELATIVE_PATH)
}

pub fn open_db() -> Connection {
    let path = db_path();
    let conn = Connection::open(&path).unwrap_or_else(|e| {
        if !path.exists() {
            eprintln!("No vault at {}", path.display());
            eprintln!("Create a vault first using the password manager app.");
        } else {
            eprintln!("Cannot open database: {}", e);
        }
        process::exit(1);
    });
    conn.execute_batch("PRAGMA foreign_keys=ON;").ok();
    conn
}

pub fn with_auth<F: FnOnce(&Connection, &[u8; KEY_LEN])>(f: F) {
    let conn = open_db();
    let key = verify_and_derive_key(&conn, &get_master_password()).unwrap_or_else(|e| {
        eprintln!("{}", e);
        process::exit(1);
    });
    f(&conn, &key);
}
