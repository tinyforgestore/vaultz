use rusqlite::{params, Result as SqlResult};

use super::Database;

impl Database {
    /// Returns the current unix timestamp in seconds.
    pub fn now_unix() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64
    }

    /// Stores (or replaces) the license key and records the current time as the
    /// validation timestamp.  Uses a single-row table with id=1.
    pub fn store_license(&self, key: &str) -> SqlResult<()> {
        let now = Self::now_unix();
        self.conn.execute(
            "INSERT INTO license (id, license_key, license_validated_at) VALUES (1, ?1, ?2)
             ON CONFLICT(id) DO UPDATE SET license_key = excluded.license_key,
                                           license_validated_at = excluded.license_validated_at",
            params![key, now],
        )?;
        Ok(())
    }

    /// Updates only the validation timestamp (re-validation without changing the key).
    pub fn touch_license_validated_at(&self) -> SqlResult<()> {
        let now = Self::now_unix();
        self.conn.execute(
            "UPDATE license SET license_validated_at = ?1 WHERE id = 1",
            params![now],
        )?;
        Ok(())
    }

    /// Clears the validation timestamp so that `is_license_active()` immediately returns false.
    /// Called when Gumroad explicitly reports the license as revoked/invalid.
    pub fn clear_license_validated_at(&self) -> SqlResult<()> {
        self.conn.execute(
            "UPDATE license SET license_validated_at = NULL WHERE id = 1",
            [],
        )?;
        Ok(())
    }

    /// Returns (license_key, license_validated_at) if a row exists.
    pub fn get_license(&self) -> SqlResult<Option<(String, Option<i64>)>> {
        let mut stmt = self
            .conn
            .prepare("SELECT license_key, license_validated_at FROM license WHERE id = 1")?;
        let mut rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<i64>>(1)?,
            ))
        })?;
        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    /// Synchronous check: is the stored license still within the 7-day offline window?
    /// Returns `true` only when a key exists and `license_validated_at` is ≤ 7 days ago.
    pub fn is_license_active(&self) -> bool {
        const SEVEN_DAYS_SECS: i64 = 7 * 24 * 60 * 60;
        let Ok(Some((_key, Some(validated_at)))) = self.get_license() else {
            return false;
        };
        let now = Self::now_unix();
        now - validated_at <= SEVEN_DAYS_SECS
    }
}

#[cfg(test)]
mod tests {
    use super::super::test_helpers::in_memory_db;

    #[test]
    fn store_and_retrieve_license() {
        let db = in_memory_db();
        db.store_license("KEY-123").unwrap();
        let result = db.get_license().unwrap();
        assert!(result.is_some());
        let (key, validated_at) = result.unwrap();
        assert_eq!(key, "KEY-123");
        assert!(validated_at.is_some());
    }

    #[test]
    fn is_license_active_returns_true_for_fresh_key() {
        let db = in_memory_db();
        db.store_license("KEY-ABC").unwrap();
        assert!(db.is_license_active());
    }

    #[test]
    fn is_license_active_returns_false_when_no_key() {
        let db = in_memory_db();
        assert!(!db.is_license_active());
    }

    #[test]
    fn touch_license_validated_at_updates_timestamp() {
        let db = in_memory_db();
        db.store_license("KEY-XYZ").unwrap();
        let first = db.get_license().unwrap().unwrap().1.unwrap();
        db.touch_license_validated_at().unwrap();
        let second = db.get_license().unwrap().unwrap().1.unwrap();
        // second timestamp should be >= first
        assert!(second >= first);
    }

    #[test]
    fn store_license_is_idempotent() {
        let db = in_memory_db();
        db.store_license("KEY-1").unwrap();
        db.store_license("KEY-2").unwrap();
        let (key, _) = db.get_license().unwrap().unwrap();
        assert_eq!(key, "KEY-2");
    }

    #[test]
    fn is_license_active_returns_false_when_validated_at_is_8_days_ago() {
        use super::super::Database;
        let db = in_memory_db();
        // Insert a license with a timestamp 8 days in the past (beyond the 7-day window).
        let eight_days_ago = Database::now_unix() - 8 * 24 * 60 * 60;
        db.conn
            .execute(
                "INSERT INTO license (id, license_key, license_validated_at) VALUES (1, 'KEY-OLD', ?1)",
                rusqlite::params![eight_days_ago],
            )
            .unwrap();
        assert!(!db.is_license_active());
    }
}
