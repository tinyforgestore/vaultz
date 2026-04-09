pub struct Entry {
    pub id: i64,
    pub name: String,
    pub username: Option<String>,
    pub email: Option<String>,
    pub password: String,
    pub website: Option<String>,
    pub notes: Option<String>,
    pub folder_name: String,
    pub is_favorite: bool,
}
