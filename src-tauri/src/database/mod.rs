use rusqlite::{Connection, Result as SqlResult};
use std::path::PathBuf;

mod folders;
mod license;
mod master;
mod passwords;
pub mod models;

pub use models::*;

pub const DB_FILENAME: &str = "passwords.db";

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS master_password (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    password_hash TEXT NOT NULL,
    encryption_salt TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
);

CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
);

CREATE TABLE IF NOT EXISTS passwords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT,
    email TEXT,
    password TEXT NOT NULL,
    website TEXT,
    notes TEXT,
    recovery_email TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    folder_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')),
    FOREIGN KEY (folder_id) REFERENCES folders(id)
);

CREATE TABLE IF NOT EXISTS license (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    license_key TEXT NOT NULL,
    license_validated_at INTEGER
);
";

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(app_data_dir: PathBuf) -> SqlResult<Self> {
        std::fs::create_dir_all(&app_data_dir).map_err(|e| {
            rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
                Some(format!("Failed to create app data dir: {}", e)),
            )
        })?;

        let db_path = app_data_dir.join(DB_FILENAME);
        let conn = Connection::open(&db_path)?;

        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        Ok(Database { conn })
    }

    pub fn db_file_exists(app_data_dir: &PathBuf) -> bool {
        app_data_dir.join(DB_FILENAME).exists()
    }

    pub fn initialize_schema(&self) -> SqlResult<()> {
        self.conn.execute_batch(SCHEMA)
    }

    pub fn run_migrations(&self) -> SqlResult<()> {
        let has_is_favorite: bool = self
            .conn
            .prepare("SELECT is_favorite FROM passwords LIMIT 0")
            .is_ok();
        if !has_is_favorite {
            self.conn.execute_batch(
                "ALTER TABLE passwords ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;",
            )?;
        }

        let has_encryption_salt: bool = self
            .conn
            .prepare("SELECT encryption_salt FROM master_password LIMIT 0")
            .is_ok();
        if !has_encryption_salt {
            self.conn.execute_batch(
                "ALTER TABLE master_password ADD COLUMN encryption_salt TEXT;",
            )?;
        }

        let has_license_table: bool = self
            .conn
            .prepare("SELECT id FROM license LIMIT 0")
            .is_ok();
        if !has_license_table {
            self.conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS license (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    license_key TEXT NOT NULL,
                    license_validated_at INTEGER
                );",
            )?;
        }

        Ok(())
    }

    /// Returns the total number of stored passwords.
    pub fn count_passwords(&self) -> SqlResult<i64> {
        self.conn
            .query_row("SELECT COUNT(*) FROM passwords", [], |row| row.get(0))
    }

    /// Returns the total number of folders.
    pub fn count_folders(&self) -> SqlResult<i64> {
        self.conn
            .query_row("SELECT COUNT(*) FROM folders", [], |row| row.get(0))
    }

    pub fn export_to_path(&self, path: &str) -> SqlResult<()> {
        let escaped = path.replace('\'', "''");
        self.conn.execute_batch(&format!("VACUUM INTO '{}';", escaped))
    }
}

#[cfg(test)]
pub mod test_helpers {
    use super::Database;
    use rusqlite::Connection;

    /// Opens an in-memory SQLite Database with schema applied.
    pub fn in_memory_db() -> Database {
        let conn = Connection::open_in_memory().expect("in-memory db");
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        let db = Database { conn };
        db.initialize_schema().expect("schema");
        db
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use test_helpers::in_memory_db;

    #[test]
    fn initialize_schema_is_idempotent() {
        let db = in_memory_db();
        // Running schema a second time should not fail (CREATE TABLE IF NOT EXISTS)
        db.initialize_schema().expect("second init");
    }

    #[test]
    fn run_migrations_on_fresh_db_is_a_no_op() {
        let db = in_memory_db();
        // Both columns already exist; migrations should succeed without error
        db.run_migrations().expect("migrations");
    }

    #[test]
    fn db_file_exists_returns_false_for_nonexistent_path() {
        let dir = std::path::PathBuf::from("/tmp/nonexistent_test_dir_pm_123456");
        assert!(!Database::db_file_exists(&dir));
    }
}
