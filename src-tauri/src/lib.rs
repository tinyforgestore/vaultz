use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, Emitter, Manager, State,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, ShortcutState};

mod commands;
pub mod constants;
mod crypto;
mod database;
mod session_artifacts;
mod state;
mod window_helpers;

use constants::{MAIN, OVERLAY_GENERATOR, OVERLAY_SEARCH, VAULT_LOCKED};
use database::Database;
use state::{DbState, SessionState};
use window_helpers::{hide_window, show_window, toggle_window};

/// Returns true if the session is currently authenticated.
fn is_session_authed(app: &tauri::AppHandle) -> bool {
    let state: State<Mutex<SessionState>> = app.state();
    state.lock().map(|g| g.is_authenticated).unwrap_or(false)
}

/// Records an overlay window label that should be revealed once the user logs in.
/// Consumed by `commands::session::auth::login` after successful auth.
fn set_pending_overlay_intent(app: &tauri::AppHandle, label: &str) {
    let state: State<Mutex<SessionState>> = app.state();
    if let Ok(mut g) = state.lock() {
        g.pending_overlay_intent = Some(label.to_string());
    };
}

fn prewarm_overlays(app: &mut App) {
    for label in [OVERLAY_SEARCH, OVERLAY_GENERATOR] {
        if let Some(win) = app.get_webview_window(label) {
            let _ = win.hide();
            // On overlay window blur (focus loss), auto-hide it.
            let app_handle = app.handle().clone();
            let label_owned = label.to_string();
            win.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(false) = event {
                    let _ = hide_window(&app_handle, &label_owned);
                }
            });
        }
    }
}

fn setup_tray(app: &mut App) -> tauri::Result<()> {
    let open_item = MenuItem::with_id(app, "open", "Open Vaultz", true, None::<&str>)?;
    let lock_item = MenuItem::with_id(app, "lock", "Lock", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open_item, &lock_item, &quit_item])?;

    let icon = app
        .default_window_icon()
        .expect("no default window icon configured in tauri.conf.json")
        .clone();

    TrayIconBuilder::new()
        .icon(icon)
        .icon_as_template(false)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Vaultz")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => {
                let _ = show_window(app, MAIN);
            }
            "lock" => {
                let session_state: State<Mutex<SessionState>> = app.state();
                session_state.lock().unwrap().clear();
                crate::session_artifacts::clear_session_artifacts(app);
                let _ = app.emit(VAULT_LOCKED, ());
                let _ = hide_window(app, OVERLAY_SEARCH);
                let _ = hide_window(app, OVERLAY_GENERATOR);
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = show_window(tray.app_handle(), MAIN);
            }
        })
        .build(app)?;
    Ok(())
}

fn register_global_shortcuts(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle().clone();
    let search_shortcut = tauri_plugin_global_shortcut::Shortcut::new(
        Some(Modifiers::META | Modifiers::SHIFT),
        Code::KeyL,
    );
    let gen_shortcut = tauri_plugin_global_shortcut::Shortcut::new(
        Some(Modifiers::META | Modifiers::SHIFT),
        Code::KeyG,
    );
    let main_shortcut = tauri_plugin_global_shortcut::Shortcut::new(
        Some(Modifiers::META | Modifiers::ALT),
        Code::KeyV,
    );

    app.global_shortcut()
        .on_shortcut(search_shortcut, move |_app, _sc, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }
            if is_session_authed(&handle) {
                let _ = toggle_window(&handle, OVERLAY_SEARCH);
            } else {
                set_pending_overlay_intent(&handle, OVERLAY_SEARCH);
                let _ = show_window(&handle, MAIN);
            }
        })?;

    let handle2 = app.handle().clone();
    app.global_shortcut()
        .on_shortcut(gen_shortcut, move |_app, _sc, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }
            if is_session_authed(&handle2) {
                let _ = toggle_window(&handle2, OVERLAY_GENERATOR);
            } else {
                set_pending_overlay_intent(&handle2, OVERLAY_GENERATOR);
                let _ = show_window(&handle2, MAIN);
            }
        })?;

    let handle3 = app.handle().clone();
    app.global_shortcut()
        .on_shortcut(main_shortcut, move |_app, _sc, event| {
            if event.state == ShortcutState::Pressed {
                let _ = show_window(&handle3, MAIN);
            }
        })?;
    Ok(())
}

fn setup_main_window_close(app: &mut App) {
    if let Some(main_win) = app.get_webview_window(MAIN) {
        let win = main_win.clone();
        main_win.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = win.hide();
            }
        });
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(Mutex::new(SessionState::default()))
        .manage(Mutex::<Option<Database>>::new(None))
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

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

            prewarm_overlays(app);
            setup_tray(app)?;
            register_global_shortcuts(app)?;
            setup_main_window_close(app);

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
            commands::overlay::show_overlay_search,
            commands::overlay::hide_overlay_search,
            commands::overlay::show_overlay_generator,
            commands::overlay::hide_overlay_generator,
            commands::overlay::lock_vault,
            commands::overlay::open_create_entry_prefilled,
            commands::generated_passwords::record_generated_password,
            commands::generated_passwords::list_generated_passwords,
            commands::generated_passwords::delete_generated_password,
            commands::generated_passwords::clear_generated_passwords,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
