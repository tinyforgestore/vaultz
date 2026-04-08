use rusqlite::{params, Result as SqlResult};

use super::{CreatePasswordInput, Database, PasswordEntry, UpdatePasswordInput};

impl Database {
    const PASSWORD_COLUMNS: &str = "id, name, username, email, password, website, notes, recovery_email, is_favorite, folder_id, created_at, updated_at";

    fn row_to_password(row: &rusqlite::Row) -> rusqlite::Result<PasswordEntry> {
        Ok(PasswordEntry {
            id: row.get::<_, i64>(0)?.to_string(),
            name: row.get(1)?,
            username: row.get(2)?,
            email: row.get(3)?,
            password: row.get(4)?,
            website: row.get(5)?,
            notes: row.get(6)?,
            recovery_email: row.get(7)?,
            is_favorite: row.get::<_, i64>(8)? != 0,
            folder_id: row.get::<_, i64>(9)?.to_string(),
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
        })
    }

    pub fn get_all_passwords(&self) -> SqlResult<Vec<PasswordEntry>> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {} FROM passwords ORDER BY id",
            Self::PASSWORD_COLUMNS
        ))?;
        let rows = stmt.query_map([], Self::row_to_password)?;
        rows.collect()
    }

    pub fn get_passwords_by_folder(&self, folder_id: i64) -> SqlResult<Vec<PasswordEntry>> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {} FROM passwords WHERE folder_id = ?1 ORDER BY id",
            Self::PASSWORD_COLUMNS
        ))?;
        let rows = stmt.query_map(params![folder_id], Self::row_to_password)?;
        rows.collect()
    }

    pub fn get_password_by_id(&self, id: i64) -> SqlResult<Option<PasswordEntry>> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {} FROM passwords WHERE id = ?1",
            Self::PASSWORD_COLUMNS
        ))?;
        let mut rows = stmt.query_map(params![id], Self::row_to_password)?;
        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    pub fn create_password(&self, input: &CreatePasswordInput) -> SqlResult<PasswordEntry> {
        let folder_id: i64 = input
            .folder
            .as_deref()
            .unwrap_or("1")
            .parse()
            .unwrap_or(1);
        self.conn.execute(
            "INSERT INTO passwords (name, username, password, website, notes, folder_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![input.service_name, input.username, input.password, input.url, input.notes, folder_id],
        )?;
        let id = self.conn.last_insert_rowid();
        self.get_password_by_id(id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
    }

    pub fn update_password(&self, id: i64, updates: &UpdatePasswordInput) -> SqlResult<PasswordEntry> {
        let mut set_clauses: Vec<String> = Vec::new();
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(ref v) = updates.name {
            set_clauses.push("name = ?".to_string());
            param_values.push(Box::new(v.clone()));
        }
        if let Some(ref v) = updates.username {
            set_clauses.push("username = ?".to_string());
            param_values.push(Box::new(v.clone()));
        }
        if let Some(ref v) = updates.email {
            set_clauses.push("email = ?".to_string());
            param_values.push(Box::new(v.clone()));
        }
        if let Some(ref v) = updates.password {
            set_clauses.push("password = ?".to_string());
            param_values.push(Box::new(v.clone()));
        }
        if let Some(ref v) = updates.website {
            set_clauses.push("website = ?".to_string());
            param_values.push(Box::new(v.clone()));
        }
        if let Some(ref v) = updates.notes {
            set_clauses.push("notes = ?".to_string());
            param_values.push(Box::new(v.clone()));
        }
        if let Some(ref v) = updates.recovery_email {
            set_clauses.push("recovery_email = ?".to_string());
            param_values.push(Box::new(v.clone()));
        }
        if let Some(v) = updates.is_favorite {
            set_clauses.push("is_favorite = ?".to_string());
            param_values.push(Box::new(v as i64));
        }
        if let Some(ref v) = updates.folder_id {
            set_clauses.push("folder_id = ?".to_string());
            param_values.push(Box::new(v.parse::<i64>().unwrap_or(1)));
        }

        if set_clauses.is_empty() {
            return self.get_password_by_id(id)?.ok_or(rusqlite::Error::QueryReturnedNoRows);
        }

        set_clauses.push("updated_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')".to_string());
        param_values.push(Box::new(id));

        let sql = format!("UPDATE passwords SET {} WHERE id = ?", set_clauses.join(", "));
        let param_refs: Vec<&dyn rusqlite::types::ToSql> =
            param_values.iter().map(|p| p.as_ref()).collect();
        self.conn.execute(&sql, param_refs.as_slice())?;

        self.get_password_by_id(id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
    }

    pub fn delete_password(&self, id: i64) -> SqlResult<()> {
        self.conn.execute("DELETE FROM passwords WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn delete_passwords(&self, ids: &[i64]) -> SqlResult<()> {
        if ids.is_empty() {
            return Ok(());
        }
        let placeholders: Vec<String> = ids.iter().map(|_| "?".to_string()).collect();
        let sql = format!("DELETE FROM passwords WHERE id IN ({})", placeholders.join(", "));
        let param_refs: Vec<Box<dyn rusqlite::types::ToSql>> =
            ids.iter().map(|id| Box::new(*id) as Box<dyn rusqlite::types::ToSql>).collect();
        let params: Vec<&dyn rusqlite::types::ToSql> =
            param_refs.iter().map(|p| p.as_ref()).collect();
        self.conn.execute(&sql, params.as_slice())?;
        Ok(())
    }

    pub fn search_passwords(&self, query: &str) -> SqlResult<Vec<PasswordEntry>> {
        let pattern = format!("%{}%", query);
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {} FROM passwords WHERE name LIKE ?1 OR username LIKE ?1 OR email LIKE ?1 OR website LIKE ?1 ORDER BY id",
            Self::PASSWORD_COLUMNS
        ))?;
        let rows = stmt.query_map(params![pattern], Self::row_to_password)?;
        rows.collect()
    }

    pub fn get_passwords_for_encryption(&self) -> SqlResult<Vec<(i64, String, Option<String>)>> {
        let mut stmt = self.conn.prepare("SELECT id, password, notes FROM passwords")?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })?;
        rows.collect()
    }

    pub fn update_encrypted_fields(&self, id: i64, password: &str, notes: Option<&str>) -> SqlResult<()> {
        self.conn.execute(
            "UPDATE passwords SET password = ?1, notes = ?2 WHERE id = ?3",
            params![password, notes, id],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::super::test_helpers::in_memory_db;
    use super::super::{CreatePasswordInput, UpdatePasswordInput};

    fn seed_folder(db: &super::super::Database) -> i64 {
        db.create_folder("Default", "folder", true).unwrap().id.parse().unwrap()
    }

    fn make_input(folder_id: i64) -> CreatePasswordInput {
        CreatePasswordInput {
            service_name: "GitHub".to_string(),
            username: "user".to_string(),
            password: "secret".to_string(),
            url: Some("https://github.com".to_string()),
            notes: None,
            folder: Some(folder_id.to_string()),
        }
    }

    #[test]
    fn create_and_get_password() {
        let db = in_memory_db();
        let fid = seed_folder(&db);
        let input = make_input(fid);
        let pw = db.create_password(&input).unwrap();
        assert_eq!(pw.name, "GitHub");
        assert_eq!(pw.password, "secret");
        assert!(!pw.is_favorite);
    }

    #[test]
    fn get_all_passwords_empty() {
        let db = in_memory_db();
        let rows = db.get_all_passwords().unwrap();
        assert!(rows.is_empty());
    }

    #[test]
    fn get_passwords_by_folder() {
        let db = in_memory_db();
        let fid = seed_folder(&db);
        db.create_password(&make_input(fid)).unwrap();
        let rows = db.get_passwords_by_folder(fid).unwrap();
        assert_eq!(rows.len(), 1);
        let other = db.create_folder("Other", "o", false).unwrap();
        let other_id: i64 = other.id.parse().unwrap();
        let empty = db.get_passwords_by_folder(other_id).unwrap();
        assert!(empty.is_empty());
    }

    #[test]
    fn get_password_by_id_returns_none_for_missing() {
        let db = in_memory_db();
        let result = db.get_password_by_id(999).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn update_password_name() {
        let db = in_memory_db();
        let fid = seed_folder(&db);
        let pw = db.create_password(&make_input(fid)).unwrap();
        let id: i64 = pw.id.parse().unwrap();
        let updated = db.update_password(id, &UpdatePasswordInput {
            name: Some("Bitbucket".to_string()),
            ..Default::default()
        }).unwrap();
        assert_eq!(updated.name, "Bitbucket");
    }

    #[test]
    fn update_password_is_favorite() {
        let db = in_memory_db();
        let fid = seed_folder(&db);
        let pw = db.create_password(&make_input(fid)).unwrap();
        let id: i64 = pw.id.parse().unwrap();
        let updated = db.update_password(id, &UpdatePasswordInput {
            is_favorite: Some(true),
            ..Default::default()
        }).unwrap();
        assert!(updated.is_favorite);
    }

    #[test]
    fn update_password_no_fields_returns_unchanged() {
        let db = in_memory_db();
        let fid = seed_folder(&db);
        let pw = db.create_password(&make_input(fid)).unwrap();
        let id: i64 = pw.id.parse().unwrap();
        let unchanged = db.update_password(id, &UpdatePasswordInput::default()).unwrap();
        assert_eq!(unchanged.name, "GitHub");
    }

    #[test]
    fn delete_password() {
        let db = in_memory_db();
        let fid = seed_folder(&db);
        let pw = db.create_password(&make_input(fid)).unwrap();
        let id: i64 = pw.id.parse().unwrap();
        db.delete_password(id).unwrap();
        assert!(db.get_password_by_id(id).unwrap().is_none());
    }

    #[test]
    fn delete_passwords_bulk() {
        let db = in_memory_db();
        let fid = seed_folder(&db);
        let a = db.create_password(&make_input(fid)).unwrap();
        let b = db.create_password(&make_input(fid)).unwrap();
        let ids: Vec<i64> = vec![a.id.parse().unwrap(), b.id.parse().unwrap()];
        db.delete_passwords(&ids).unwrap();
        assert!(db.get_all_passwords().unwrap().is_empty());
    }

    #[test]
    fn delete_passwords_empty_slice_is_noop() {
        let db = in_memory_db();
        assert!(db.delete_passwords(&[]).is_ok());
    }

    #[test]
    fn search_passwords_by_name() {
        let db = in_memory_db();
        let fid = seed_folder(&db);
        db.create_password(&make_input(fid)).unwrap();
        let results = db.search_passwords("git").unwrap();
        assert_eq!(results.len(), 1);
        let none = db.search_passwords("xyz").unwrap();
        assert!(none.is_empty());
    }

    #[test]
    fn get_passwords_for_encryption_and_update() {
        let db = in_memory_db();
        let fid = seed_folder(&db);
        let pw = db.create_password(&make_input(fid)).unwrap();
        let id: i64 = pw.id.parse().unwrap();
        let rows = db.get_passwords_for_encryption().unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].0, id);
        db.update_encrypted_fields(id, "ENC:abc.def", Some("ENC:notes")).unwrap();
        let updated = db.get_password_by_id(id).unwrap().unwrap();
        assert_eq!(updated.password, "ENC:abc.def");
        assert_eq!(updated.notes, Some("ENC:notes".to_string()));
    }
}
