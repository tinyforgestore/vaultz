use std::process;

use rusqlite::{params, Connection};

use vaultz_core::crypto::{encrypt_field, KEY_LEN};
use crate::input::{prompt, prompt_optional, prompt_usize, read_password};

pub fn cmd_add(conn: &Connection, key: &[u8; KEY_LEN]) {
    let name = loop {
        let s = prompt("Name: ");
        if !s.is_empty() { break s; }
        eprintln!("Name is required.");
    };
    let username = prompt_optional("Username (optional): ");
    let email = prompt_optional("Email (optional): ");
    let password_plain = read_password("Password: ");
    if password_plain.is_empty() {
        eprintln!("Password is required.");
        process::exit(1);
    }
    let url = prompt_optional("URL (optional): ");
    let notes = prompt_optional("Notes (optional): ");

    let folders: Vec<(i64, String)> = {
        let mut stmt = conn
            .prepare("SELECT id, name FROM folders ORDER BY name")
            .expect("prepare");
        stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
            .expect("query")
            .filter_map(|r| r.ok())
            .collect()
    };
    if folders.is_empty() {
        eprintln!("No folders found in vault.");
        process::exit(1);
    }

    println!("Folders:");
    for (i, (_, fname)) in folders.iter().enumerate() {
        println!("  {}. {}", i + 1, fname);
    }
    let idx = prompt_usize("Choose folder: ", 1, folders.len()) - 1;
    let (folder_id, _) = &folders[idx];

    let enc_password = encrypt_field(key, &password_plain).unwrap_or_else(|e| {
        eprintln!("{}", e);
        process::exit(1);
    });
    let enc_notes = notes
        .as_deref()
        .map(|n| {
            encrypt_field(key, n).unwrap_or_else(|e| {
                eprintln!("{}", e);
                process::exit(1);
            })
        });

    conn.execute(
        "INSERT INTO passwords (name, username, email, password, website, notes, folder_id,
                                created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7,
                 strftime('%Y-%m-%dT%H:%M:%S.000Z','now'),
                 strftime('%Y-%m-%dT%H:%M:%S.000Z','now'))",
        params![name, username, email, enc_password, url, enc_notes, folder_id],
    )
    .unwrap_or_else(|e| {
        eprintln!("Insert failed: {}", e);
        process::exit(1);
    });

    println!("Entry \"{}\" added.", name);
}
