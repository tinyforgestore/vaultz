use rusqlite::{params, Result as SqlResult};

use super::Database;

impl Database {
    /// Returns the stored lock timeout in minutes, or `None` meaning "Never lock".
    pub fn get_lock_timeout(&self) -> SqlResult<Option<i64>> {
        let mut stmt = self
            .conn
            .prepare("SELECT lock_timeout_minutes FROM settings WHERE id = 1")?;
        let mut rows = stmt.query([])?;
        match rows.next()? {
            Some(row) => row.get(0),
            None => Ok(None),
        }
    }

    /// Upserts the lock timeout. `None` means "Never lock".
    pub fn set_lock_timeout(&self, minutes: Option<i64>) -> SqlResult<()> {
        self.conn.execute(
            "INSERT INTO settings (id, lock_timeout_minutes) VALUES (1, ?1)
             ON CONFLICT(id) DO UPDATE SET lock_timeout_minutes = excluded.lock_timeout_minutes",
            params![minutes],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::super::test_helpers::in_memory_db;

    #[test]
    fn get_lock_timeout_returns_none_when_no_row() {
        let db = in_memory_db();
        assert_eq!(db.get_lock_timeout().unwrap(), None);
    }

    #[test]
    fn set_and_get_lock_timeout_some() {
        let db = in_memory_db();
        db.set_lock_timeout(Some(15)).unwrap();
        assert_eq!(db.get_lock_timeout().unwrap(), Some(15));
    }

    #[test]
    fn set_lock_timeout_none_stores_null() {
        let db = in_memory_db();
        db.set_lock_timeout(Some(5)).unwrap();
        db.set_lock_timeout(None).unwrap();
        assert_eq!(db.get_lock_timeout().unwrap(), None);
    }

    #[test]
    fn set_lock_timeout_is_idempotent_upsert() {
        let db = in_memory_db();
        db.set_lock_timeout(Some(5)).unwrap();
        db.set_lock_timeout(Some(30)).unwrap();
        assert_eq!(db.get_lock_timeout().unwrap(), Some(30));
    }
}
