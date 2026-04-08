use rusqlite::{params, Result as SqlResult};

use super::Database;

impl Database {
    pub fn store_master_password_hash(&self, hash: &str) -> SqlResult<()> {
        self.conn.execute(
            "INSERT INTO master_password (id, password_hash) VALUES (1, ?1)",
            params![hash],
        )?;
        Ok(())
    }

    pub fn get_master_password_hash(&self) -> SqlResult<String> {
        self.conn.query_row(
            "SELECT password_hash FROM master_password WHERE id = 1",
            [],
            |row| row.get(0),
        )
    }

    pub fn update_master_password_hash(&self, hash: &str) -> SqlResult<()> {
        self.conn.execute(
            "UPDATE master_password SET password_hash = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now') WHERE id = 1",
            params![hash],
        )?;
        Ok(())
    }

    pub fn get_encryption_salt(&self) -> SqlResult<Option<String>> {
        self.conn.query_row(
            "SELECT encryption_salt FROM master_password WHERE id = 1",
            [],
            |row| row.get(0),
        )
    }

    pub fn store_encryption_salt(&self, salt: &str) -> SqlResult<()> {
        self.conn.execute(
            "UPDATE master_password SET encryption_salt = ?1 WHERE id = 1",
            params![salt],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::super::test_helpers::in_memory_db;

    #[test]
    fn store_and_get_master_password_hash() {
        let db = in_memory_db();
        db.store_master_password_hash("hash123").unwrap();
        let hash = db.get_master_password_hash().unwrap();
        assert_eq!(hash, "hash123");
    }

    #[test]
    fn get_master_password_hash_fails_when_empty() {
        let db = in_memory_db();
        assert!(db.get_master_password_hash().is_err());
    }

    #[test]
    fn update_master_password_hash() {
        let db = in_memory_db();
        db.store_master_password_hash("old_hash").unwrap();
        db.update_master_password_hash("new_hash").unwrap();
        let hash = db.get_master_password_hash().unwrap();
        assert_eq!(hash, "new_hash");
    }

    #[test]
    fn get_encryption_salt_returns_none_when_unset() {
        let db = in_memory_db();
        db.store_master_password_hash("hash").unwrap();
        let salt = db.get_encryption_salt().unwrap();
        assert!(salt.is_none());
    }

    #[test]
    fn store_and_get_encryption_salt() {
        let db = in_memory_db();
        db.store_master_password_hash("hash").unwrap();
        db.store_encryption_salt("mysalt").unwrap();
        let salt = db.get_encryption_salt().unwrap();
        assert_eq!(salt, Some("mysalt".to_string()));
    }
}
