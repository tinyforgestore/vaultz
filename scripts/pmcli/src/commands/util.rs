use std::process;

use vaultz_core::models::Entry;

pub fn require_one(entries: Vec<Entry>, name: &str) -> Entry {
    match entries.len() {
        0 => {
            eprintln!("No entry matching \"{}\"", name);
            process::exit(1);
        }
        1 => entries.into_iter().next().unwrap(),
        _ => {
            eprintln!("Multiple entries match \"{}\":", name);
            for e in &entries {
                eprintln!("  {} [{}]", e.name, e.folder_name);
            }
            eprintln!("Use a more specific name.");
            process::exit(1);
        }
    }
}
