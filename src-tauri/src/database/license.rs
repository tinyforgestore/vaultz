use rusqlite::{params, Result as SqlResult};

use super::Database;

/// Offline grace period for a validated license: 30 days.
///
/// This is how long we keep trusting Lemon Squeezy's last "yes" without hearing
/// from it again — the window a user keeps Pro while offline. Every *confirmed*
/// validation rewrites `license_validated_at`, so the window rolls forward and a
/// license only lapses after this many consecutive seconds without a single
/// successful validation. Shared by `is_license_active()` and the
/// `validate_license` command so the two can never drift apart.
pub const LICENSE_GRACE_SECS: i64 = 30 * 24 * 60 * 60;

/// How often we ask Lemon Squeezy to re-confirm the license: once per 24 hours.
///
/// Deliberately much shorter than `LICENSE_GRACE_SECS`. The two answer different
/// questions and must never be conflated:
/// - REVALIDATE = how often we *ask* LS. Bounds how long a refunded/revoked
///   license keeps working for an online user (~24h).
/// - GRACE      = how long we *trust* the last yes. Bounds how long an offline
///   user keeps Pro with no answer at all (30 days).
///
/// If the skip-the-network check used GRACE, an online user would never reach the
/// network path and revocation would never be detected.
pub const LICENSE_REVALIDATE_SECS: i64 = 24 * 60 * 60;

/// Forward clock-skew tolerated on `license_validated_at`: 5 minutes.
///
/// A timestamp in the future is normally a red flag (set the clock forward,
/// activate, let NTP correct it back and `now - validated_at` goes negative,
/// which an unguarded `<= WINDOW` check would read as "active" essentially
/// forever). But a machine whose clock is a little fast at activation time is
/// innocent, so a small forward window is accepted rather than punished.
pub const LICENSE_CLOCK_SKEW_TOLERANCE_SECS: i64 = 5 * 60;

/// Is `validated_at` recent enough, given `now` and a window length?
///
/// Range-checked on both sides with saturating arithmetic: a bogus timestamp
/// (`i64::MIN`/`i64::MAX`, a pre-1970 clock, a future timestamp beyond the skew
/// tolerance) is rejected instead of overflowing — plain `now - validated_at`
/// panics on `i64::MIN` in debug builds, and this gates every vault write.
pub fn is_timestamp_within(now: i64, validated_at: i64, window_secs: i64) -> bool {
    let age = now.saturating_sub(validated_at);
    age >= -LICENSE_CLOCK_SKEW_TOLERANCE_SECS && age <= window_secs
}

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
    ///
    /// This is the *activation* path only — a successful Lemon Squeezy
    /// `/activate` is itself a confirmation, so arming the grace window here is
    /// correct. Anything that merely needs to record an instance id must use
    /// [`Database::store_license_instance_id`] instead, so that
    /// [`Database::touch_license_validated_at`] stays the only place a
    /// *revalidation* can move the window.
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

    /// Updates only `license_instance_id`, leaving `license_validated_at` and the
    /// cached activation counts untouched.
    ///
    /// Used by the `validate_license` healing path, which mints an instance id for
    /// a legacy row. Reusing `store_license` there would arm the full 30-day grace
    /// window as a side effect of an `/activate` call, before `/validate` had been
    /// asked anything — making `license_validated_at` mean two different things
    /// depending on which code path wrote it.
    pub fn store_license_instance_id(&self, instance_id: &str) -> SqlResult<()> {
        self.conn.execute(
            "UPDATE license SET license_instance_id = ?1 WHERE id = 1",
            params![instance_id],
        )?;
        Ok(())
    }

    /// Updates only the validation timestamp (re-validation without changing the key).
    ///
    /// The **single write site** for a revalidation-driven change to
    /// `license_validated_at`: only a confirmed "yes" from Lemon Squeezy reaches
    /// here, which is what lets the column be read as "the last time LS said yes".
    /// (`store_license` also sets it, but only on a fresh activation — itself a
    /// confirmation — and `clear_license_validated_at` only nulls it.)
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
        let mut stmt = self
            .conn
            .prepare("SELECT activation_usage, activation_limit FROM license WHERE id = 1")?;
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

    /// Synchronous check: is the stored license still within the offline grace window?
    /// Returns `true` only when a non-empty key exists and `license_validated_at`
    /// is within `LICENSE_GRACE_SECS` of now.
    ///
    /// The key must be non-empty for the same reason `resolve_locally` treats an
    /// empty key as Free: the two are the crate's only entitlement readers and
    /// must agree, and this one is what gates every vault write.
    pub fn is_license_active(&self) -> bool {
        let Ok(Some((key, Some(validated_at), _instance_id))) = self.get_license() else {
            return false;
        };
        if key.is_empty() {
            return false;
        }
        let now = Self::now_unix();
        is_timestamp_within(now, validated_at, LICENSE_GRACE_SECS)
    }

    /// Test-only: forces `license_validated_at` to an arbitrary value (or NULL) so
    /// tests outside this module can build an aged / lapsed / never-validated row
    /// without reaching into the private connection.
    #[cfg(test)]
    pub fn set_license_validated_at_for_test(&self, validated_at: Option<i64>) -> SqlResult<()> {
        self.conn.execute(
            "UPDATE license SET license_validated_at = ?1 WHERE id = 1",
            params![validated_at],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::super::test_helpers::in_memory_db;
    use super::super::Database;
    // Imported through the `database` façade (not `super::`) so the sibling
    // constants have exactly one canonical import path across the crate.
    use crate::database::{
        is_timestamp_within, LICENSE_CLOCK_SKEW_TOLERANCE_SECS, LICENSE_GRACE_SECS,
        LICENSE_REVALIDATE_SECS,
    };

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
    fn is_license_active_returns_false_for_an_empty_key() {
        // `store_license` stamps a fresh `license_validated_at`, so the *only*
        // thing making this row inactive is the empty key. Mirrors
        // `resolve_locally_reports_free_for_an_empty_key` in `commands::license`:
        // the two entitlement readers must never disagree.
        let db = in_memory_db();
        db.store_license("", "inst-empty").unwrap();
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

    /// Inserts a license row with `validated_at` set `days_ago` days in the past.
    fn insert_license_validated_days_ago(
        db: &Database,
        key: &str,
        days_ago: i64,
        instance_id: Option<&str>,
    ) {
        let ts = Database::now_unix() - days_ago * 24 * 60 * 60;
        db.conn
            .execute(
                "INSERT INTO license (id, license_key, license_validated_at, license_instance_id) VALUES (1, ?1, ?2, ?3)",
                rusqlite::params![key, ts, instance_id],
            )
            .unwrap();
    }

    #[test]
    fn is_license_active_returns_true_at_29_days() {
        let db = in_memory_db();
        insert_license_validated_days_ago(&db, "KEY-29", 29, Some("inst-29"));
        assert!(db.is_license_active());
    }

    #[test]
    fn is_license_active_returns_false_at_31_days() {
        let db = in_memory_db();
        insert_license_validated_days_ago(&db, "KEY-31", 31, Some("inst-31"));
        assert!(!db.is_license_active());
    }

    #[test]
    fn touch_license_validated_at_restarts_the_window() {
        // A license validated 29 days ago is active; touching it moves
        // `license_validated_at` to now, so the 30-day window restarts from here.
        let db = in_memory_db();
        insert_license_validated_days_ago(&db, "KEY-ROLL", 29, Some("inst-roll"));
        assert!(db.is_license_active());

        db.touch_license_validated_at().unwrap();

        let now = Database::now_unix();
        let renewed = db.get_license().unwrap().unwrap().1.unwrap();
        // Expect ~now, not 29 days ago. This slack only absorbs the second or two
        // that can elapse between the write and this read — it is unrelated to
        // LICENSE_CLOCK_SKEW_TOLERANCE_SECS, which is a forward-clock allowance.
        const WRITE_READ_SLACK_SECS: i64 = 60;
        assert!(
            now - renewed < WRITE_READ_SLACK_SECS,
            "expected renewed timestamp, got {renewed}"
        );
        assert!(db.is_license_active());
    }

    #[test]
    fn clear_license_validated_at_deactivates_immediately() {
        let db = in_memory_db();
        db.store_license("KEY-REVOKED", "inst-revoked").unwrap();
        assert!(db.is_license_active());
        db.clear_license_validated_at().unwrap();
        assert!(!db.is_license_active());
        // The key itself is retained; only the timestamp is cleared.
        let (key, validated_at, _) = db.get_license().unwrap().unwrap();
        assert_eq!(key, "KEY-REVOKED");
        assert_eq!(validated_at, None);
    }

    #[test]
    fn is_license_active_ignores_missing_instance_id() {
        // Legacy rows (activated before the license_instance_id migration) must not
        // be short-circuited to inactive — only the timestamp decides.
        let db = in_memory_db();
        insert_license_validated_days_ago(&db, "KEY-LEGACY", 1, None);
        let (_, _, instance_id) = db.get_license().unwrap().unwrap();
        assert_eq!(instance_id, None);
        assert!(db.is_license_active());
    }

    #[test]
    fn is_license_active_returns_true_at_the_exact_grace_boundary() {
        let db = in_memory_db();
        let now = Database::now_unix();
        db.conn
            .execute(
                "INSERT INTO license (id, license_key, license_validated_at) VALUES (1, 'KEY-EDGE', ?1)",
                rusqlite::params![now - LICENSE_GRACE_SECS],
            )
            .unwrap();
        assert!(db.is_license_active());
    }

    #[test]
    fn is_license_active_returns_false_for_a_future_timestamp() {
        // Clock set forward, license activated, NTP corrects the clock back: an
        // unguarded `now - validated_at <= WINDOW` would read as active forever.
        let db = in_memory_db();
        insert_license_validated_days_ago(&db, "KEY-FUTURE", -1, Some("inst-future"));
        assert!(!db.is_license_active());
    }

    #[test]
    fn is_license_active_does_not_panic_on_i64_min_timestamp() {
        // `now - i64::MIN` overflows and panics in debug builds — and this gates
        // every vault write, so it would crash on save.
        let db = in_memory_db();
        db.conn
            .execute(
                "INSERT INTO license (id, license_key, license_validated_at) VALUES (1, 'KEY-MIN', ?1)",
                rusqlite::params![i64::MIN],
            )
            .unwrap();
        assert!(!db.is_license_active());
    }

    #[test]
    fn is_timestamp_within_accepts_inside_the_window_and_small_forward_skew() {
        let now = 1_000_000_000i64;
        assert!(is_timestamp_within(now, now, LICENSE_REVALIDATE_SECS));
        assert!(is_timestamp_within(
            now,
            now - LICENSE_REVALIDATE_SECS,
            LICENSE_REVALIDATE_SECS
        ));
        // A slightly fast clock at activation time is tolerated, not punished.
        assert!(is_timestamp_within(now, now + 60, LICENSE_REVALIDATE_SECS));
    }

    #[test]
    fn is_timestamp_within_accepts_forward_skew_up_to_the_exact_tolerance() {
        // Pins the boundary itself, not just a value comfortably inside it.
        let now = 1_000_000_000i64;
        assert!(
            is_timestamp_within(
                now,
                now + LICENSE_CLOCK_SKEW_TOLERANCE_SECS,
                LICENSE_REVALIDATE_SECS
            ),
            "exactly at the forward-skew tolerance is accepted"
        );
        assert!(
            !is_timestamp_within(
                now,
                now + LICENSE_CLOCK_SKEW_TOLERANCE_SECS + 1,
                LICENSE_REVALIDATE_SECS
            ),
            "one second beyond the forward-skew tolerance is rejected"
        );
    }

    #[test]
    fn forward_clock_skew_tolerance_is_five_minutes() {
        // Deliberately a hard-coded literal: the assertions above are written in
        // terms of the constant, so they move with it and cannot catch a widened
        // tolerance. Forward skew is an entitlement bypass — a user who sets the
        // clock forward gets that much extra Pro past a lapse — so the *value*
        // is policy and changing it must be a conscious edit here too.
        assert_eq!(LICENSE_CLOCK_SKEW_TOLERANCE_SECS, 300);
        let now = 1_000_000_000i64;
        assert!(is_timestamp_within(now, now + 300, LICENSE_REVALIDATE_SECS));
        assert!(!is_timestamp_within(
            now,
            now + 301,
            LICENSE_REVALIDATE_SECS
        ));
    }

    #[test]
    fn is_timestamp_within_rejects_stale_and_far_future_and_extreme_values() {
        let now = 1_000_000_000i64;
        assert!(!is_timestamp_within(
            now,
            now - LICENSE_REVALIDATE_SECS - 1,
            LICENSE_REVALIDATE_SECS
        ));
        assert!(!is_timestamp_within(
            now,
            now + 86_400,
            LICENSE_REVALIDATE_SECS
        ));
        assert!(!is_timestamp_within(now, i64::MIN, LICENSE_GRACE_SECS));
        assert!(!is_timestamp_within(now, i64::MAX, LICENSE_GRACE_SECS));
        // A pre-1970 clock makes now_unix() return 0; a real timestamp must not
        // then read as active.
        assert!(!is_timestamp_within(0, now, LICENSE_GRACE_SECS));
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
    fn store_license_instance_id_leaves_the_validation_timestamp_alone() {
        // The single-writer invariant: healing a legacy row records an instance id
        // and nothing else. Using store_license here would arm the full 30-day
        // grace window from an /activate call, before /validate said anything.
        let db = in_memory_db();
        insert_license_validated_days_ago(&db, "KEY-HEAL", 29, None);
        let before = db.get_license().unwrap().unwrap().1;
        db.store_activation_counts(Some(1), Some(3)).unwrap();

        db.store_license_instance_id("inst-healed").unwrap();

        let (key, validated_at, instance_id) = db.get_license().unwrap().unwrap();
        assert_eq!(instance_id, Some("inst-healed".to_string()));
        assert_eq!(
            validated_at, before,
            "license_validated_at must be untouched by healing"
        );
        assert_eq!(key, "KEY-HEAL");
        assert_eq!(
            db.get_activation_counts().unwrap(),
            (Some(1), Some(3)),
            "cached counts must be untouched by healing"
        );
    }

    #[test]
    fn set_license_validated_at_for_test_writes_and_nulls_the_timestamp() {
        let db = in_memory_db();
        db.store_license("KEY-SET", "inst-set").unwrap();

        db.set_license_validated_at_for_test(Some(123)).unwrap();
        assert_eq!(db.get_license().unwrap().unwrap().1, Some(123));

        db.set_license_validated_at_for_test(None).unwrap();
        assert_eq!(db.get_license().unwrap().unwrap().1, None);
    }

    #[test]
    fn get_activation_counts_returns_none_when_no_row() {
        let db = in_memory_db();
        let (usage, limit) = db.get_activation_counts().unwrap();
        assert_eq!(usage, None);
        assert_eq!(limit, None);
    }
}
