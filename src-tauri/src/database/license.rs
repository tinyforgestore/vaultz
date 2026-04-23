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

    /// Stores (or replaces) the license key, instance_id, and records the current time as the
    /// validation timestamp.  Uses a single-row table with id=1.
    pub fn store_license(&self, key: &str, instance_id: &str) -> SqlResult<()> {
        let now = Self::now_unix();
        self.conn.execute(
            "INSERT INTO license (id, license_key, license_validated_at, license_instance_id) VALUES (1, ?1, ?2, ?3)
             ON CONFLICT(id) DO UPDATE SET license_key = excluded.license_key,
                                           license_validated_at = excluded.license_validated_at,
                                           license_instance_id = excluded.license_instance_id",
            params![key, now, instance_id],
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
    /// Called when LS explicitly reports the license as revoked/invalid.
    pub fn clear_license_validated_at(&self) -> SqlResult<()> {
        self.conn.execute(
            "UPDATE license SET license_validated_at = NULL WHERE id = 1",
            [],
        )?;
        Ok(())
    }

    /// Returns (license_key, license_validated_at, license_instance_id) if a row exists.
    pub fn get_license(&self) -> SqlResult<Option<(String, Option<i64>, Option<String>)>> {
        let mut stmt = self
            .conn
            .prepare("SELECT license_key, license_validated_at, license_instance_id FROM license WHERE id = 1")?;
        let mut rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<i64>>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })?;
        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    /// Stores cached activation counts (usage and limit) from LS API responses.
    pub fn store_activation_counts(&self, usage: Option<u32>, limit: Option<u32>) -> SqlResult<()> {
        self.conn.execute(
            "UPDATE license SET activation_usage = ?1, activation_limit = ?2 WHERE id = 1",
            params![usage, limit],
        )?;
        Ok(())
    }

    /// Returns (activation_usage, activation_limit) from the stored license row.
    pub fn get_activation_counts(&self) -> SqlResult<(Option<u32>, Option<u32>)> {
        let mut stmt = self.conn.prepare(
            "SELECT activation_usage, activation_limit FROM license WHERE id = 1",
        )?;
        let mut rows = stmt.query_map([], |row| {
            Ok((row.get::<_, Option<u32>>(0)?, row.get::<_, Option<u32>>(1)?))
        })?;
        match rows.next() {
            Some(row) => Ok(row?),
            None => Ok((None, None)),
        }
    }

    /// Deletes the license row entirely (used during deactivation).
    pub fn clear_license(&self) -> SqlResult<()> {
        self.conn.execute("DELETE FROM license WHERE id = 1", [])?;
        Ok(())
    }

    /// Synchronous check: is the stored license still within the 7-day offline window?
    /// Returns `true` only when a key exists and `license_validated_at` is ≤ 7 days ago.
    pub fn is_license_active(&self) -> bool {
        const SEVEN_DAYS_SECS: i64 = 7 * 24 * 60 * 60;
        let Ok(Some((_key, Some(validated_at), _instance_id))) = self.get_license() else {
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
        db.store_license("KEY-123", "inst-uuid-1").unwrap();
        let result = db.get_license().unwrap();
        assert!(result.is_some());
        let (key, validated_at, instance_id) = result.unwrap();
        assert_eq!(key, "KEY-123");
        assert!(validated_at.is_some());
        assert_eq!(instance_id, Some("inst-uuid-1".to_string()));
    }

    #[test]
    fn is_license_active_returns_true_for_fresh_key() {
        let db = in_memory_db();
        db.store_license("KEY-ABC", "inst-abc").unwrap();
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
        db.store_license("KEY-XYZ", "inst-xyz").unwrap();
        let first = db.get_license().unwrap().unwrap().1.unwrap();
        db.touch_license_validated_at().unwrap();
        let second = db.get_license().unwrap().unwrap().1.unwrap();
        // second timestamp should be >= first
        assert!(second >= first);
    }

    #[test]
    fn store_license_is_idempotent() {
        let db = in_memory_db();
        db.store_license("KEY-1", "inst-1").unwrap();
        db.store_license("KEY-2", "inst-2").unwrap();
        let (key, _, instance_id) = db.get_license().unwrap().unwrap();
        assert_eq!(key, "KEY-2");
        assert_eq!(instance_id, Some("inst-2".to_string()));
    }

    #[test]
    fn is_license_active_returns_false_when_validated_at_is_8_days_ago() {
        use super::super::Database;
        let db = in_memory_db();
        // Insert a license with a timestamp 8 days in the past (beyond the 7-day window).
        let eight_days_ago = Database::now_unix() - 8 * 24 * 60 * 60;
        db.conn
            .execute(
                "INSERT INTO license (id, license_key, license_validated_at, license_instance_id) VALUES (1, 'KEY-OLD', ?1, 'inst-old')",
                rusqlite::params![eight_days_ago],
            )
            .unwrap();
        assert!(!db.is_license_active());
    }

    #[test]
    fn clear_license_removes_row() {
        let db = in_memory_db();
        db.store_license("KEY-CLEAR", "inst-clear").unwrap();
        assert!(db.get_license().unwrap().is_some());
        db.clear_license().unwrap();
        assert!(db.get_license().unwrap().is_none());
    }

    #[test]
    fn store_and_get_activation_counts() {
        let db = in_memory_db();
        db.store_license("KEY-AC", "inst-ac").unwrap();
        db.store_activation_counts(Some(2), Some(5)).unwrap();
        let (usage, limit) = db.get_activation_counts().unwrap();
        assert_eq!(usage, Some(2));
        assert_eq!(limit, Some(5));
    }

    #[test]
    fn get_activation_counts_returns_none_when_no_row() {
        let db = in_memory_db();
        let (usage, limit) = db.get_activation_counts().unwrap();
        assert_eq!(usage, None);
        assert_eq!(limit, None);
    }
}
