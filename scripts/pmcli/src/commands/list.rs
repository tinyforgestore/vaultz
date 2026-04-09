use rusqlite::Connection;

use crate::util::truncate;

pub fn cmd_list(conn: &Connection) {
    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.name, p.username, p.website, f.name
             FROM passwords p JOIN folders f ON p.folder_id = f.id
             ORDER BY f.name, p.name",
        )
        .expect("prepare");
    let rows: Vec<(i64, String, Option<String>, Option<String>, String)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)))
        .expect("query")
        .filter_map(|r| r.ok())
        .collect();

    if rows.is_empty() {
        println!("No entries.");
        return;
    }

    println!(
        "{:>4}  {:<28}  {:<22}  {:<32}  {:<20}",
        "ID", "Name", "Username", "URL", "Folder"
    );
    println!("{}", "─".repeat(114));
    for (id, name, username, website, folder) in rows {
        println!(
            "{:>4}  {:<28}  {:<22}  {:<32}  {:<20}",
            id,
            truncate(&name, 28),
            truncate(&username.unwrap_or_default(), 22),
            truncate(&website.unwrap_or_default(), 32),
            truncate(&folder, 20),
        );
    }
}
