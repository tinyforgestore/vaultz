// pmcli — CLI for the password manager vault
//
// Usage: cargo run --manifest-path scripts/pmcli/Cargo.toml -- <command> [args]
//
// Master password: set PM_PASSWORD env var or enter at prompt.

use std::{
    env,
    io::{self, Write},
    path::PathBuf,
    process::{self, Command, Stdio},
    thread,
    time::Duration,
};

use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit, Nonce};
use argon2::{Argon2, PasswordVerifier};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use clap::{Parser, Subcommand};
use password_hash::rand_core::{OsRng, RngCore};
use rusqlite::{params, Connection};

const ENC_PREFIX: &str = "ENC:";
const MAGIC: &[u8] = b"PMVAULT1";
const VAULT_SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;
const HEADER_LEN: usize = MAGIC.len() + VAULT_SALT_LEN + NONCE_LEN;
const CLEAR_DELAY_SECS: u64 = 45;

#[derive(Parser)]
#[command(name = "pmcli", about = "Password manager CLI")]
struct Cli {
    #[command(subcommand)]
    command: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// List all entries
    List,
    /// Show a decrypted entry (requires master password)
    Show { name: String },
    /// Copy a password to clipboard; clears after 45 seconds (requires master password)
    Copy { name: String },
    /// Add a new entry interactively (requires master password)
    Add,
    /// Delete an entry (requires master password)
    Delete { name: String },
    /// Export vault as an encrypted .pmvault file
    Export {
        #[arg(long)]
        out: String,
    },
    /// Import a .pmvault file (replaces the current vault)
    Import { file: String },
}

struct Entry {
    id: i64,
    name: String,
    username: Option<String>,
    email: Option<String>,
    password: String,
    website: Option<String>,
    notes: Option<String>,
    folder_name: String,
    is_favorite: bool,
}

// ── Path & connection ─────────────────────────────────────────────────────────

fn db_path() -> PathBuf {
    let home = env::var("HOME").unwrap_or_else(|_| {
        eprintln!("HOME not set");
        process::exit(1);
    });
    PathBuf::from(home)
        .join("Library/Application Support/store.tinyforge.vaultz/passwords.db")
}

fn open_db() -> Connection {
    let path = db_path();
    if !path.exists() {
        eprintln!("No vault at {}", path.display());
        eprintln!("Create a vault first using the password manager app.");
        process::exit(1);
    }
    let conn = Connection::open(&path).unwrap_or_else(|e| {
        eprintln!("Cannot open database: {}", e);
        process::exit(1);
    });
    conn.execute_batch("PRAGMA foreign_keys=ON;").ok();
    conn
}

// ── Input helpers ─────────────────────────────────────────────────────────────

fn read_password(msg: &str) -> String {
    rpassword::prompt_password(msg).unwrap_or_else(|e| {
        eprintln!("Cannot read password: {}", e);
        process::exit(1);
    })
}

fn get_master_password() -> String {
    if let Ok(pw) = env::var("PM_PASSWORD") {
        return pw;
    }
    read_password("Master password: ")
}

fn prompt(msg: &str) -> String {
    print!("{}", msg);
    io::stdout().flush().ok();
    let mut buf = String::new();
    io::stdin().read_line(&mut buf).ok();
    buf.trim().to_string()
}

fn prompt_optional(msg: &str) -> Option<String> {
    let s = prompt(msg);
    if s.is_empty() { None } else { Some(s) }
}

fn prompt_usize(msg: &str, min: usize, max: usize) -> usize {
    loop {
        let s = prompt(msg);
        match s.parse::<usize>() {
            Ok(n) if (min..=max).contains(&n) => return n,
            _ => eprintln!("Enter a number from {} to {}", min, max),
        }
    }
}

fn truncate(s: &str, n: usize) -> String {
    if s.chars().count() <= n {
        return s.to_string();
    }
    s.chars().take(n - 1).collect::<String>() + "…"
}

// ── Crypto ────────────────────────────────────────────────────────────────────

fn derive_key(password: &[u8], salt: &[u8]) -> [u8; KEY_LEN] {
    let mut key = [0u8; KEY_LEN];
    Argon2::default()
        .hash_password_into(password, salt, &mut key)
        .unwrap_or_else(|e| {
            eprintln!("Key derivation failed: {}", e);
            process::exit(1);
        });
    key
}

fn encrypt_field(key: &[u8; KEY_LEN], plaintext: &str) -> String {
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);
    let cipher = Aes256Gcm::new_from_slice(key).expect("cipher init");
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes()).expect("encrypt");
    format!(
        "{}{}.{}",
        ENC_PREFIX,
        BASE64.encode(nonce_bytes),
        BASE64.encode(ciphertext)
    )
}

fn decrypt_field(key: &[u8; KEY_LEN], value: &str) -> String {
    if !value.starts_with(ENC_PREFIX) {
        return value.to_string(); // legacy plaintext
    }
    let encoded = &value[ENC_PREFIX.len()..];
    let dot = encoded.find('.').unwrap_or_else(|| {
        eprintln!("Malformed encrypted field");
        process::exit(1);
    });
    let nonce_bytes = BASE64.decode(&encoded[..dot]).unwrap_or_else(|e| {
        eprintln!("Invalid nonce: {}", e);
        process::exit(1);
    });
    let ciphertext = BASE64.decode(&encoded[dot + 1..]).unwrap_or_else(|e| {
        eprintln!("Invalid ciphertext: {}", e);
        process::exit(1);
    });
    let cipher = Aes256Gcm::new_from_slice(key).expect("cipher init");
    let nonce = Nonce::from_slice(&nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .unwrap_or_else(|_| {
            eprintln!("Decryption failed — data may be corrupt");
            process::exit(1);
        });
    String::from_utf8(plaintext).unwrap_or_else(|_| {
        eprintln!("Decrypted data is not valid UTF-8");
        process::exit(1);
    })
}

// ── DB helpers ────────────────────────────────────────────────────────────────

fn verify_and_derive_key(conn: &Connection, password: &str) -> [u8; KEY_LEN] {
    let (stored_hash, salt_b64): (String, Option<String>) = conn
        .query_row(
            "SELECT password_hash, encryption_salt FROM master_password LIMIT 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap_or_else(|_| {
            eprintln!("Vault not initialized");
            process::exit(1);
        });

    let parsed = password_hash::PasswordHash::new(&stored_hash).unwrap_or_else(|e| {
        eprintln!("Invalid hash in database: {}", e);
        process::exit(1);
    });
    if Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_err()
    {
        eprintln!("Wrong master password");
        process::exit(1);
    }

    let salt_b64 = salt_b64.unwrap_or_else(|| {
        eprintln!("Encryption salt missing");
        process::exit(1);
    });
    let salt = BASE64.decode(&salt_b64).unwrap_or_else(|e| {
        eprintln!("Invalid salt: {}", e);
        process::exit(1);
    });

    derive_key(password.as_bytes(), &salt)
}

const ENTRY_COLS: &str = "
    SELECT p.id, p.name, p.username, p.email, p.password, p.website, p.notes,
           f.name, p.is_favorite
    FROM passwords p JOIN folders f ON p.folder_id = f.id
";

fn row_to_entry(r: &rusqlite::Row<'_>) -> rusqlite::Result<Entry> {
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

fn find_entries(conn: &Connection, name: &str) -> Vec<Entry> {
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

fn require_one(entries: Vec<Entry>, name: &str) -> Entry {
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

fn with_auth<F: FnOnce(&Connection, &[u8; KEY_LEN])>(f: F) {
    let conn = open_db();
    let key = verify_and_derive_key(&conn, &get_master_password());
    f(&conn, &key);
}

// ── Clipboard (macOS pbcopy) ───────────────────────────────────────────────────

fn set_clipboard(text: &str) {
    let mut child = Command::new("pbcopy")
        .stdin(Stdio::piped())
        .spawn()
        .unwrap_or_else(|e| {
            eprintln!("pbcopy failed: {}", e);
            process::exit(1);
        });
    if let Some(stdin) = child.stdin.as_mut() {
        stdin.write_all(text.as_bytes()).ok();
    }
    child.wait().ok();
}

// ── Commands ──────────────────────────────────────────────────────────────────

fn cmd_list(conn: &Connection) {
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
        "{:>4}  {:<28}  {:<22}  {:<32}  {}",
        "ID", "Name", "Username", "URL", "Folder"
    );
    println!("{}", "─".repeat(98));
    for (id, name, username, website, folder) in rows {
        println!(
            "{:>4}  {:<28}  {:<22}  {:<32}  {}",
            id,
            truncate(&name, 28),
            truncate(&username.unwrap_or_default(), 22),
            truncate(&website.unwrap_or_default(), 32),
            folder,
        );
    }
}

fn cmd_show(conn: &Connection, name: &str, key: &[u8; KEY_LEN]) {
    let entry = require_one(find_entries(conn, name), name);
    let password = decrypt_field(key, &entry.password);
    let notes = entry.notes.as_deref().map(|n| decrypt_field(key, n));

    println!("Name:      {}", entry.name);
    if let Some(u) = entry.username { println!("Username:  {}", u); }
    if let Some(em) = entry.email   { println!("Email:     {}", em); }
    println!("Password:  {}", password);
    if let Some(w) = entry.website  { println!("URL:       {}", w); }
    if let Some(n) = notes          { println!("Notes:     {}", n); }
    println!("Folder:    {}", entry.folder_name);
    if entry.is_favorite            { println!("Favorite:  yes"); }
}

fn cmd_copy(conn: &Connection, name: &str, key: &[u8; KEY_LEN]) {
    let entry = require_one(find_entries(conn, name), name);
    let password = decrypt_field(key, &entry.password);

    set_clipboard(&password);
    println!("Password for \"{}\" copied to clipboard.", entry.name);

    for remaining in (1..=CLEAR_DELAY_SECS).rev() {
        print!("\rClearing in {:2}s... ", remaining);
        io::stdout().flush().ok();
        thread::sleep(Duration::from_secs(1));
    }
    set_clipboard("");
    println!("\rClipboard cleared.            ");
}

fn cmd_add(conn: &Connection, key: &[u8; KEY_LEN]) {
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

    let enc_password = encrypt_field(key, &password_plain);
    let enc_notes = notes.as_deref().map(|n| encrypt_field(key, n));

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

fn cmd_delete(conn: &Connection, name: &str) {
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

fn cmd_export(conn: &Connection, out: &str) {
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
        eprintln!("Cannot read temp file: {}", e);
        process::exit(1);
    });
    let _ = std::fs::remove_file(&temp);

    let mut salt = [0u8; VAULT_SALT_LEN];
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce_bytes);

    let key = derive_key(passphrase.as_bytes(), &salt);
    let cipher = Aes256Gcm::new_from_slice(&key).expect("cipher init");
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_ref())
        .unwrap_or_else(|e| {
            eprintln!("Encryption failed: {}", e);
            process::exit(1);
        });

    let mut output = Vec::with_capacity(HEADER_LEN + ciphertext.len());
    output.extend_from_slice(MAGIC);
    output.extend_from_slice(&salt);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    std::fs::write(out, &output).unwrap_or_else(|e| {
        eprintln!("Cannot write output file: {}", e);
        process::exit(1);
    });
    println!("Vault exported to {}", out);
}

fn cmd_import(file: &str) {
    let data = std::fs::read(file).unwrap_or_else(|e| {
        eprintln!("Cannot read file: {}", e);
        process::exit(1);
    });

    if data.len() < HEADER_LEN {
        eprintln!("File too small to be a valid vault");
        process::exit(1);
    }
    if &data[..MAGIC.len()] != MAGIC {
        eprintln!("Not a valid .pmvault file");
        process::exit(1);
    }

    let salt = &data[MAGIC.len()..MAGIC.len() + VAULT_SALT_LEN];
    let nonce_bytes = &data[MAGIC.len() + VAULT_SALT_LEN..HEADER_LEN];
    let ciphertext = &data[HEADER_LEN..];

    let passphrase = read_password("Vault passphrase: ");

    let key = derive_key(passphrase.as_bytes(), salt);
    let cipher = Aes256Gcm::new_from_slice(&key).expect("cipher init");
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .unwrap_or_else(|_| {
            eprintln!("Decryption failed — wrong passphrase or corrupted file");
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
    std::fs::write(&target, &plaintext).unwrap_or_else(|e| {
        eprintln!("Cannot write database: {}", e);
        process::exit(1);
    });

    println!("Vault imported. Login with your vault's master password.");
}

// ── main ──────────────────────────────────────────────────────────────────────

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Cmd::List => {
            cmd_list(&open_db());
        }
        Cmd::Show { name } => with_auth(|conn, key| cmd_show(conn, &name, key)),
        Cmd::Copy { name } => with_auth(|conn, key| cmd_copy(conn, &name, key)),
        Cmd::Add => with_auth(|conn, key| cmd_add(conn, key)),
        Cmd::Delete { name } => {
            // auth gate — field key not needed for delete
            let conn = open_db();
            verify_and_derive_key(&conn, &get_master_password());
            cmd_delete(&conn, &name);
        }
        Cmd::Export { out } => {
            cmd_export(&open_db(), &out);
        }
        Cmd::Import { file } => {
            cmd_import(&file);
        }
    }
}
