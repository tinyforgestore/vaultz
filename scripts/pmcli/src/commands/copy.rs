use std::{
    io::Write,
    process::{self, Command, Stdio},
};

use rusqlite::Connection;

use super::util::require_one;
use crate::constants::CLEAR_DELAY_SECS;
use vaultz_core::crypto::{decrypt_field, KEY_LEN};
use vaultz_core::db_core::find_entries;

fn set_clipboard(text: &str) {
    let mut child = Command::new("pbcopy")
        .stdin(Stdio::piped())
        .spawn()
        .unwrap_or_else(|e| {
            eprintln!("pbcopy failed: {}", e);
            process::exit(1);
        });
    if let Some(stdin) = child.stdin.as_mut() {
        if let Err(e) = stdin.write_all(text.as_bytes()) {
            eprintln!("Clipboard write failed: {}", e);
        }
    }
    drop(child.stdin.take()); // close write end so pbcopy sees EOF
    child.wait().ok();
}

pub fn cmd_copy(conn: &Connection, name: &str, key: &[u8; KEY_LEN]) {
    let entry = require_one(find_entries(conn, name), name);
    let password = decrypt_field(key, &entry.password).unwrap_or_else(|e| {
        eprintln!("{}", e);
        process::exit(1);
    });

    set_clipboard(&password);
    println!("Password for \"{}\" copied to clipboard.", entry.name);
    println!("Clipboard will be cleared in {} seconds.", CLEAR_DELAY_SECS);

    Command::new("sh")
        .arg("-c")
        .arg(format!("sleep {} && echo -n '' | pbcopy", CLEAR_DELAY_SECS))
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .ok();
}
