use rusqlite::{params, Result as SqlResult};

use super::{Database, FolderEntry};

impl Database {
    pub fn get_all_folders(&self) -> SqlResult<Vec<FolderEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, icon, is_default, created_at FROM folders ORDER BY id",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(FolderEntry {
                id: row.get::<_, i64>(0)?.to_string(),
                name: row.get(1)?,
                icon: row.get(2)?,
                is_default: row.get::<_, i64>(3)? != 0,
                created_at: row.get(4)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_folder(&self, name: &str, icon: &str, is_default: bool) -> SqlResult<FolderEntry> {
        self.conn.execute(
            "INSERT INTO folders (name, icon, is_default) VALUES (?1, ?2, ?3)",
            params![name, icon, is_default as i64],
        )?;
        let id = self.conn.last_insert_rowid();
        self.conn.query_row(
            "SELECT id, name, icon, is_default, created_at FROM folders WHERE id = ?1",
            params![id],
            |row| {
                Ok(FolderEntry {
                    id: row.get::<_, i64>(0)?.to_string(),
                    name: row.get(1)?,
                    icon: row.get(2)?,
                    is_default: row.get::<_, i64>(3)? != 0,
                    created_at: row.get(4)?,
                })
            },
        )
    }

    pub fn reassign_passwords(&self, from_folder: i64, to_folder: i64) -> SqlResult<()> {
        self.conn.execute(
            "UPDATE passwords SET folder_id = ?1 WHERE folder_id = ?2",
            params![to_folder, from_folder],
        )?;
        Ok(())
    }

    pub fn delete_folder(&self, id: i64) -> SqlResult<()> {
        self.conn.execute("DELETE FROM folders WHERE id = ?1", params![id])?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::super::test_helpers::in_memory_db;

    #[test]
    fn get_all_folders_empty() {
        let db = in_memory_db();
        let folders = db.get_all_folders().unwrap();
        assert!(folders.is_empty());
    }

    #[test]
    fn create_folder_returns_entry() {
        let db = in_memory_db();
        let folder = db.create_folder("Work", "briefcase", false).unwrap();
        assert_eq!(folder.name, "Work");
        assert_eq!(folder.icon, "briefcase");
        assert!(!folder.is_default);
        assert!(!folder.id.is_empty());
    }

    #[test]
    fn create_default_folder() {
        let db = in_memory_db();
        let folder = db.create_folder("Default", "star", true).unwrap();
        assert!(folder.is_default);
    }

    #[test]
    fn get_all_folders_returns_all() {
        let db = in_memory_db();
        db.create_folder("A", "a", false).unwrap();
        db.create_folder("B", "b", false).unwrap();
        let folders = db.get_all_folders().unwrap();
        assert_eq!(folders.len(), 2);
    }

    #[test]
    fn delete_folder_removes_it() {
        let db = in_memory_db();
        let folder = db.create_folder("ToDelete", "trash", false).unwrap();
        let id: i64 = folder.id.parse().unwrap();
        db.delete_folder(id).unwrap();
        let folders = db.get_all_folders().unwrap();
        assert!(folders.is_empty());
    }

    #[test]
    fn reassign_passwords_moves_entries() {
        let db = in_memory_db();
        let src = db.create_folder("Src", "src", false).unwrap();
        let dst = db.create_folder("Dst", "dst", false).unwrap();
        let src_id: i64 = src.id.parse().unwrap();
        let dst_id: i64 = dst.id.parse().unwrap();
        db.conn.execute(
            "INSERT INTO passwords (name, password, folder_id) VALUES ('pw', 'secret', ?1)",
            rusqlite::params![src_id],
        ).unwrap();
        db.reassign_passwords(src_id, dst_id).unwrap();
        let count: i64 = db.conn.query_row(
            "SELECT COUNT(*) FROM passwords WHERE folder_id = ?1",
            rusqlite::params![dst_id],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(count, 1);
    }
}
