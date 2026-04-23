use std::sync::Mutex;
use tauri::{Manager, State};

mod commands;
mod crypto;
mod database;
mod state;

use database::Database;
use state::{DbState, SessionState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_deep_link::init())
        .manage(Mutex::new(SessionState::default()))
        .manage(Mutex::<Option<Database>>::new(None))
        .setup(|app| {
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data dir");

            if Database::db_file_exists(&app_data_dir) {
                let db = Database::new(app_data_dir).expect("Failed to open database");
                db.run_migrations().expect("Failed to run migrations");
                let db_state: State<DbState> = app.state();
                *db_state.lock().unwrap() = Some(db);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::session::login,
            commands::session::logout,
            commands::session::is_authenticated,
            commands::session::update_activity,
            commands::session::check_session_timeout,
            commands::session::database_exists,
            commands::session::initialize_database,
            commands::session::verify_master_password,
            commands::session::change_master_password,
            commands::folders::get_folders,
            commands::folders::create_folder,
            commands::folders::update_folder,
            commands::folders::delete_folder,
            commands::passwords::get_passwords,
            commands::passwords::get_password_by_id,
            commands::passwords::create_password,
            commands::passwords::update_password,
            commands::passwords::delete_password,
            commands::passwords::delete_passwords,
            commands::passwords::search_passwords,
            commands::clipboard::write_secret_to_clipboard,
            commands::vault::export_vault,
            commands::vault::import_vault,
            commands::vault::destroy_vault,
            commands::license::activate_license,
            commands::license::validate_license,
            commands::license::deactivate_license,
            commands::license::get_license_status,
            commands::license::check_limit_status,
            commands::settings::get_lock_timeout,
            commands::settings::set_lock_timeout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
