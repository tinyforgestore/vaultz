use std::process;

use rusqlite::{params, Connection};

use super::util::require_one;
use crate::input::prompt;
use vaultz_core::db_core::find_entries;

pub fn cmd_delete(conn: &Connection, name: &str) {
    let entry = require_one(find_entries(conn, name), name);

    let confirm = prompt(&format!(
        "Delete \"{}\" [{}]? [y/N] ",
        entry.name, entry.folder_name
    ));
    if !confirm.eq_ignore_ascii_case("y") {
        println!("Cancelled.");
        return;
    }

    conn.execute("DELETE FROM passwords WHERE id = ?1", params![entry.id])
        .unwrap_or_else(|err| {
            eprintln!("Delete failed: {}", err);
            process::exit(1);
        });
    println!("Entry \"{}\" deleted.", entry.name);
}
