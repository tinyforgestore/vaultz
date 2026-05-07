use rusqlite::{params, Result as SqlResult};
use serde::{Deserialize, Serialize};

use super::Database;

/// Maximum number of generated-password rows kept on disk.
/// On insert, anything beyond this cap (oldest first) is removed.
pub const MAX_GENERATED_PASSWORDS: usize = 10;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedPassword {
    pub id: i64,
    /// At the database layer this is still the encrypted ciphertext.
    /// The commands layer is responsible for decrypting before it is exposed.
    pub password: String,
    pub created_at: String,
}

impl Database {
    pub fn insert_generated_password(&self, encrypted: &str) -> SqlResult<i64> {
        self.conn.execute(
            "INSERT INTO generated_passwords (password) VALUES (?1)",
            params![encrypted],
        )?;
        let id = self.conn.last_insert_rowid();

        // Enforce the cap: keep only the newest MAX_GENERATED_PASSWORDS rows.
        self.conn.execute(
            "DELETE FROM generated_passwords WHERE id NOT IN (
                SELECT id FROM generated_passwords ORDER BY created_at DESC, id DESC LIMIT ?1
            )",
            params![MAX_GENERATED_PASSWORDS as i64],
        )?;

        Ok(id)
    }

    pub fn list_generated_passwords(&self) -> SqlResult<Vec<GeneratedPassword>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, password, created_at FROM generated_passwords ORDER BY created_at DESC, id DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(GeneratedPassword {
                id: row.get(0)?,
                password: row.get(1)?,
                created_at: row.get(2)?,
            })
        })?;
        rows.collect()
    }

    pub fn delete_generated_password(&self, id: i64) -> SqlResult<()> {
        self.conn
            .execute("DELETE FROM generated_passwords WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn clear_generated_passwords(&self) -> SqlResult<()> {
        self.conn.execute("DELETE FROM generated_passwords", [])?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::super::test_helpers::in_memory_db;
    use super::MAX_GENERATED_PASSWORDS;

    #[test]
    fn insert_and_list_returns_newest_first() {
        let db = in_memory_db();
        db.insert_generated_password("ENC:a").unwrap();
        db.insert_generated_password("ENC:b").unwrap();
        db.insert_generated_password("ENC:c").unwrap();
        let rows = db.list_generated_passwords().unwrap();
        assert_eq!(rows.len(), 3);
        // Newest first: ORDER BY created_at DESC, id DESC — created_at can match
        // exactly for fast inserts so id DESC is the deciding tiebreaker.
        assert_eq!(rows[0].password, "ENC:c");
        assert_eq!(rows[1].password, "ENC:b");
        assert_eq!(rows[2].password, "ENC:a");
    }

    #[test]
    fn insert_caps_history_at_max_rows() {
        let db = in_memory_db();
        for i in 0..(MAX_GENERATED_PASSWORDS + 5) {
            db.insert_generated_password(&format!("ENC:{}", i)).unwrap();
        }
        let rows = db.list_generated_passwords().unwrap();
        assert_eq!(rows.len(), MAX_GENERATED_PASSWORDS);
        // Newest entry (index MAX+4) survives; oldest (index 0..4) are pruned.
        assert_eq!(
            rows[0].password,
            format!("ENC:{}", MAX_GENERATED_PASSWORDS + 4)
        );
    }

    #[test]
    fn delete_removes_only_target_row() {
        let db = in_memory_db();
        let id_a = db.insert_generated_password("ENC:a").unwrap();
        let id_b = db.insert_generated_password("ENC:b").unwrap();
        db.delete_generated_password(id_a).unwrap();
        let rows = db.list_generated_passwords().unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].id, id_b);
    }

    #[test]
    fn clear_removes_all_rows() {
        let db = in_memory_db();
        db.insert_generated_password("ENC:a").unwrap();
        db.insert_generated_password("ENC:b").unwrap();
        db.clear_generated_passwords().unwrap();
        assert!(db.list_generated_passwords().unwrap().is_empty());
    }

    #[test]
    fn clear_on_empty_table_is_noop() {
        let db = in_memory_db();
        db.clear_generated_passwords().unwrap();
        assert!(db.list_generated_passwords().unwrap().is_empty());
    }

    #[test]
    fn list_on_empty_table_returns_empty_vec() {
        let db = in_memory_db();
        assert!(db.list_generated_passwords().unwrap().is_empty());
    }
}
