use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PasswordEntry {
    pub id: String,
    pub name: String,
    pub username: Option<String>,
    pub email: Option<String>,
    pub password: String,
    pub website: Option<String>,
    pub notes: Option<String>,
    pub recovery_email: Option<String>,
    pub is_favorite: bool,
    pub folder_id: String,
    pub favicon: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FolderEntry {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub is_default: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePasswordInput {
    pub service_name: String,
    pub username: String,
    pub password: String,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub folder: Option<String>,
    pub favicon: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFolderInput {
    pub name: String,
    pub icon: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFolderInput {
    pub name: String,
    pub icon: String,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct UpdatePasswordInput {
    pub name: Option<String>,
    pub username: Option<String>,
    pub email: Option<String>,
    pub password: Option<String>,
    pub website: Option<String>,
    pub notes: Option<String>,
    pub recovery_email: Option<String>,
    pub is_favorite: Option<bool>,
    pub folder_id: Option<String>,
    // Tri-state for `favicon`:
    // - `None` (field absent in JSON)        → leave column unchanged
    // - `Some(None)` (field is JSON `null`)  → set column to NULL
    // - `Some(Some(s))`                      → set column to `s`
    // This lets the FE clear a slug ("None" picker) by sending `favicon: null`.
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub favicon: Option<Option<String>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn favicon_tri_state_absent() {
        let v: UpdatePasswordInput = serde_json::from_str("{}").unwrap();
        assert!(v.favicon.is_none());
    }

    #[test]
    fn favicon_tri_state_null_clears() {
        let v: UpdatePasswordInput = serde_json::from_str(r#"{"favicon":null}"#).unwrap();
        assert_eq!(v.favicon, Some(None));
    }

    #[test]
    fn favicon_tri_state_string_sets() {
        let v: UpdatePasswordInput = serde_json::from_str(r#"{"favicon":"github"}"#).unwrap();
        assert_eq!(v.favicon, Some(Some("github".to_string())));
    }
}
