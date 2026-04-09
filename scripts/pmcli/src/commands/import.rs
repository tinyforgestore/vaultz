use std::process;

use vaultz_core::crypto::decrypt_vault;
use crate::db::db_path;
use crate::input::{prompt, read_password};

pub fn cmd_import(file: &str) {
    let data = std::fs::read(file).unwrap_or_else(|e| {
        eprintln!("Cannot read file: {}", e);
        process::exit(1);
    });

    let passphrase = read_password("Vault passphrase: ");

    let plaintext = decrypt_vault(&passphrase, &data).unwrap_or_else(|e| {
        eprintln!("{}", e);
        process::exit(1);
    });

    if plaintext.len() < 16 || &plaintext[..16] != b"SQLite format 3\0" {
        eprintln!("Decrypted data is not a valid SQLite database");
        process::exit(1);
    }

    let target = db_path();
    if target.exists() {
        let confirm = prompt("This will replace your current vault. Continue? [y/N] ");
        if !confirm.eq_ignore_ascii_case("y") {
            println!("Cancelled.");
            return;
        }
    }

    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let tmp = target.with_extension("db.tmp");
    std::fs::write(&tmp, &plaintext).unwrap_or_else(|e| {
        eprintln!("Cannot write database: {}", e);
        process::exit(1);
    });
    std::fs::rename(&tmp, &target).unwrap_or_else(|e| {
        let _ = std::fs::remove_file(&tmp);
        eprintln!("Cannot replace vault: {}", e);
        process::exit(1);
    });

    println!("Vault imported. Login with your vault's master password.");
}
