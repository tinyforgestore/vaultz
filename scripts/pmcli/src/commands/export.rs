use std::process;

use rusqlite::Connection;

use vaultz_core::crypto::encrypt_vault;
use crate::input::read_password;

pub fn cmd_export(conn: &Connection, out: &str) {
    let passphrase = read_password("Vault passphrase: ");
    let confirm = read_password("Confirm passphrase: ");
    if passphrase != confirm {
        eprintln!("Passphrases do not match.");
        process::exit(1);
    }
    if passphrase.chars().count() < 8 {
        eprintln!("Passphrase must be at least 8 characters.");
        process::exit(1);
    }

    let temp = format!("{}.tmp", out);
    let _ = std::fs::remove_file(&temp);
    conn.execute_batch(&format!("VACUUM INTO '{}';", temp.replace('\'', "''")))
        .unwrap_or_else(|e| {
            eprintln!("VACUUM INTO failed: {}", e);
            process::exit(1);
        });

    let plaintext = std::fs::read(&temp).unwrap_or_else(|e| {
        let _ = std::fs::remove_file(&temp);
        eprintln!("Cannot read temp file: {}", e);
        process::exit(1);
    });
    let _ = std::fs::remove_file(&temp);

    let output = encrypt_vault(&passphrase, &plaintext).unwrap_or_else(|e| {
        eprintln!("{}", e);
        process::exit(1);
    });

    std::fs::write(out, &output).unwrap_or_else(|e| {
        eprintln!("Cannot write output file: {}", e);
        process::exit(1);
    });
    println!("Vault exported to {}", out);
}
