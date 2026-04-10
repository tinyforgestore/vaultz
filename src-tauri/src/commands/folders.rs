use tauri::State;

use crate::database::{CreateFolderInput, FolderEntry, UpdateFolderInput};
use crate::state::{parse_id, with_db, DbState};

const MAX_FOLDER_NAME_LEN: usize = 30;

fn validate_folder_name(name: &str) -> Result<&str, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_FOLDER_NAME_LEN {
        return Err("Folder name must be 1–30 characters".to_string());
    }
    Ok(trimmed)
}

#[tauri::command]
pub fn get_folders(db_state: State<DbState>) -> Result<Vec<FolderEntry>, String> {
    with_db(&db_state, |db| {
        db.get_all_folders().map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_folder(
    input: CreateFolderInput,
    db_state: State<DbState>,
) -> Result<FolderEntry, String> {
    let name = validate_folder_name(&input.name)?;
    with_db(&db_state, |db| {
        // Enforce free-tier limit of 5 folders unless a valid license is active.
        if !db.is_license_active() {
            let count = db.count_folders().map_err(|e| e.to_string())?;
            if count >= super::license::FREE_FOLDER_LIMIT {
                return Err("LIMIT_REACHED:folders".to_string());
            }
        }
        db.create_folder(name, &input.icon, false)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_folder(
    folder_id: String,
    input: UpdateFolderInput,
    db_state: State<DbState>,
) -> Result<FolderEntry, String> {
    let name = validate_folder_name(&input.name)?;
    with_db(&db_state, |db| {
        let id = parse_id(&folder_id)?;
        db.update_folder(id, name, &input.icon)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_folder(folder_id: String, db_state: State<DbState>) -> Result<(), String> {
    with_db(&db_state, |db| {
        let folder_id_num = parse_id(&folder_id)?;

        let folders = db.get_all_folders().map_err(|e| e.to_string())?;
        let fallback_folder = folders
            .iter()
            .find(|f| f.id != folder_id)
            .ok_or("Cannot delete the last folder".to_string())?;
        let fallback_id = parse_id(&fallback_folder.id)?;

        db.reassign_passwords(folder_id_num, fallback_id)
            .map_err(|e| e.to_string())?;
        db.delete_folder(folder_id_num).map_err(|e| e.to_string())
    })
}

#[cfg(test)]
mod tests {
    use crate::database::test_helpers::in_memory_db;
    use crate::state::parse_id;

    /// Mirrors delete_folder logic without State wrappers.
    fn delete_folder_logic(db: &crate::database::Database, folder_id: &str) -> Result<(), String> {
        let folder_id_num = parse_id(folder_id)?;
        let folders = db.get_all_folders().map_err(|e| e.to_string())?;
        let fallback_folder = folders
            .iter()
            .find(|f| f.id != folder_id)
            .ok_or("Cannot delete the last folder".to_string())?;
        let fallback_id = parse_id(&fallback_folder.id)?;
        db.reassign_passwords(folder_id_num, fallback_id)
            .map_err(|e| e.to_string())?;
        db.delete_folder(folder_id_num).map_err(|e| e.to_string())
    }

    #[test]
    fn delete_folder_reassigns_passwords_to_fallback() {
        use crate::database::CreatePasswordInput;

        let db = in_memory_db();
        let src = db.create_folder("Src", "s", false).unwrap();
        let dst = db.create_folder("Dst", "d", false).unwrap();
        db.create_password(&CreatePasswordInput {
            service_name: "pw".to_string(),
            username: "u".to_string(),
            password: "secret".to_string(),
            url: None,
            notes: None,
            folder: Some(src.id.clone()),
        }).unwrap();
        delete_folder_logic(&db, &src.id).unwrap();
        let folders = db.get_all_folders().unwrap();
        assert_eq!(folders.len(), 1);
        assert_eq!(folders[0].id, dst.id);
        let dst_id: i64 = dst.id.parse().unwrap();
        let moved = db.get_passwords_by_folder(dst_id).unwrap();
        assert_eq!(moved.len(), 1);
    }

    #[test]
    fn cannot_delete_last_folder() {
        let db = in_memory_db();
        let folder = db.create_folder("Only", "o", false).unwrap();
        let result = delete_folder_logic(&db, &folder.id);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Cannot delete the last folder"));
    }

    #[test]
    fn get_all_folders_returns_created_folders() {
        let db = in_memory_db();
        db.create_folder("A", "a", false).unwrap();
        db.create_folder("B", "b", false).unwrap();
        let folders = db.get_all_folders().unwrap();
        assert_eq!(folders.len(), 2);
    }
}
