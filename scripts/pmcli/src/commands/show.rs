use std::process;

use rusqlite::Connection;

use super::util::require_one;
use vaultz_core::crypto::{decrypt_field, KEY_LEN};
use vaultz_core::db_core::find_entries;

pub fn cmd_show(conn: &Connection, name: &str, key: &[u8; KEY_LEN]) {
    let entry = require_one(find_entries(conn, name), name);
    let password = decrypt_field(key, &entry.password).unwrap_or_else(|e| {
        eprintln!("{}", e);
        process::exit(1);
    });
    let notes = entry.notes.as_deref().map(|n| {
        decrypt_field(key, n).unwrap_or_else(|e| {
            eprintln!("{}", e);
            process::exit(1);
        })
    });

    println!("Name:      {}", entry.name);
    if let Some(u) = entry.username  { println!("Username:  {}", u); }
    if let Some(em) = entry.email    { println!("Email:     {}", em); }
    println!("Password:  {}", password);
    if let Some(w) = entry.website   { println!("URL:       {}", w); }
    if let Some(n) = notes           { println!("Notes:     {}", n); }
    println!("Folder:    {}", entry.folder_name);
    if entry.is_favorite             { println!("Favorite:  yes"); }
}
