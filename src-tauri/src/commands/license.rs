use gethostname::gethostname;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::database::Database;
use crate::state::{with_db, DbState};

const LS_ACTIVATE_URL: &str = "https://api.lemonsqueezy.com/v1/licenses/activate";
const LS_VALIDATE_URL: &str = "https://api.lemonsqueezy.com/v1/licenses/validate";
const LS_DEACTIVATE_URL: &str = "https://api.lemonsqueezy.com/v1/licenses/deactivate";

pub const FREE_PASSWORD_LIMIT: i64 = 20;
pub const FREE_FOLDER_LIMIT: i64 = 5;

#[derive(Serialize)]
struct LsActivateRequest<'a> {
    license_key: &'a str,
    instance_name: String,
}

#[derive(Deserialize)]
struct LsActivateInstance {
    id: String,
}

#[derive(Deserialize)]
struct LsActivateLicenseKey {
    activation_limit: Option<u32>,
    activation_usage: Option<u32>,
}

#[derive(Deserialize)]
struct LsActivateResponse {
    activated: bool,
    instance: Option<LsActivateInstance>,
    license_key: Option<LsActivateLicenseKey>,
}

#[derive(Serialize)]
struct LsValidateRequest<'a> {
    license_key: &'a str,
    instance_id: &'a str,
}

#[derive(Deserialize)]
struct LsValidateLicenseKey {
    activation_limit: Option<u32>,
    activation_usage: Option<u32>,
}

#[derive(Deserialize)]
struct LsValidateResponse {
    valid: bool,
    license_key: Option<LsValidateLicenseKey>,
}

#[derive(Serialize)]
struct LsDeactivateRequest<'a> {
    license_key: &'a str,
    instance_id: &'a str,
}

#[derive(Serialize)]
pub struct LicenseStatus {
    pub is_active: bool,
    pub activation_usage: Option<u32>,
    pub activation_limit: Option<u32>,
}

fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .use_rustls_tls()
        .build()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn activate_license(key: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let redacted = key
        .chars()
        .rev()
        .take(4)
        .collect::<String>()
        .chars()
        .rev()
        .collect::<String>();
    eprintln!("[license] activate_license called with key: ...{}", redacted);

    let client = build_client()?;
    let hostname = gethostname().to_string_lossy().to_string();

    let body = LsActivateRequest {
        license_key: &key,
        instance_name: hostname,
    };

    let resp = client
        .post(LS_ACTIVATE_URL)
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            eprintln!("[license] HTTP request failed: {}", e);
            e.to_string()
        })?;

    let parsed: LsActivateResponse = resp.json().await.map_err(|e| {
        eprintln!("[license] failed to parse activate response: {}", e);
        e.to_string()
    })?;

    if !parsed.activated {
        eprintln!("[license] LS returned activated=false");
        return Err("License key is invalid or already in use".to_string());
    }

    let instance_id = match parsed.instance.as_ref() {
        Some(inst) => inst.id.as_str(),
        None => {
            eprintln!("[license] LS returned activated=true but instance was null");
            return Err("Activation failed: no instance ID returned".to_string());
        }
    };

    eprintln!(
        "[license] license valid — storing in DB with instance_id={}",
        instance_id
    );
    with_db(&db_state, |db| {
        db.store_license(&key, instance_id).map_err(|e| {
            eprintln!("[license] failed to store license: {}", e);
            e.to_string()
        })?;
        if let Some(lk) = parsed.license_key.as_ref() {
            let _ = db.store_activation_counts(lk.activation_usage, lk.activation_limit);
        }
        Ok(())
    })
}

#[tauri::command]
pub async fn validate_license(db_state: State<'_, DbState>) -> Result<bool, String> {
    const SEVEN_DAYS_SECS: i64 = 7 * 24 * 60 * 60;

    let license_info = with_db(&db_state, |db| {
        db.get_license().map_err(|e| e.to_string())
    })?;

    let (key, validated_at, instance_id) = match license_info {
        None => return Ok(false),
        Some((k, v, i)) => (k, v, i),
    };

    let instance_id = match instance_id {
        Some(id) if !id.is_empty() => id,
        _ => return Ok(false),
    };

    let now = Database::now_unix();
    if let Some(ts) = validated_at {
        if now - ts <= SEVEN_DAYS_SECS {
            // Only skip the network call if activation counts are already cached.
            // If counts are missing (e.g. license activated before this migration),
            // fall through to populate them via a network validation.
            let counts_cached = with_db(&db_state, |db| {
                Ok(db.get_activation_counts().map(|(u, _)| u.is_some()).unwrap_or(false))
            })
            .unwrap_or(false);
            if counts_cached {
                return Ok(true);
            }
        }
    }

    let client = build_client().map_err(|e| e.to_string())?;
    let body = LsValidateRequest {
        license_key: &key,
        instance_id: &instance_id,
    };

    let result = client
        .post(LS_VALIDATE_URL)
        .json(&body)
        .send()
        .await;

    match result {
        Ok(resp) => {
            let parsed: LsValidateResponse = resp.json().await.map_err(|e| e.to_string())?;
            if parsed.valid {
                with_db(&db_state, |db| {
                    db.touch_license_validated_at().map_err(|e| e.to_string())
                })?;
                if let Some(lk) = parsed.license_key.as_ref() {
                    let _ = with_db(&db_state, |db| {
                        db.store_activation_counts(lk.activation_usage, lk.activation_limit)
                            .map_err(|e| e.to_string())
                    });
                }
                Ok(true)
            } else {
                with_db(&db_state, |db| {
                    db.clear_license_validated_at().map_err(|e| e.to_string())
                })?;
                Ok(false)
            }
        }
        Err(e) => {
            eprintln!("[license] validate_license network error: {}", e);
            Ok(true)
        }
    }
}

#[tauri::command]
pub async fn deactivate_license(db_state: State<'_, DbState>) -> Result<(), String> {
    let license_info = with_db(&db_state, |db| {
        db.get_license().map_err(|e| e.to_string())
    })?;

    let (key, _, instance_id) = match license_info {
        None => return Ok(()),
        Some(info) => info,
    };

    let instance_id = match instance_id {
        Some(id) if !id.is_empty() => id,
        _ => {
            // No instance_id — just clear the local DB row
            return with_db(&db_state, |db| {
                db.clear_license().map_err(|e| e.to_string())
            });
        }
    };

    let client = build_client()?;
    let body = LsDeactivateRequest {
        license_key: &key,
        instance_id: &instance_id,
    };

    // Fire and forget: even if deactivation API call fails, clear the local record
    let _ = client
        .post(LS_DEACTIVATE_URL)
        .json(&body)
        .send()
        .await;

    with_db(&db_state, |db| {
        db.clear_license().map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_license_status(db_state: State<'_, DbState>) -> Result<LicenseStatus, String> {
    with_db(&db_state, |db| {
        let (usage, limit) = db.get_activation_counts().unwrap_or((None, None));
        Ok(LicenseStatus {
            is_active: db.is_license_active(),
            activation_usage: usage,
            activation_limit: limit,
        })
    })
}

#[derive(Serialize)]
pub struct LimitStatus {
    pub passwords_at_limit: bool,
    pub folders_at_limit: bool,
}

#[tauri::command]
pub fn check_limit_status(db_state: State<'_, DbState>) -> Result<LimitStatus, String> {
    with_db(&db_state, |db| {
        if db.is_license_active() {
            return Ok(LimitStatus {
                passwords_at_limit: false,
                folders_at_limit: false,
            });
        }

        let password_count = db.count_passwords().map_err(|e| e.to_string())?;
        let folder_count = db.count_folders().map_err(|e| e.to_string())?;

        Ok(LimitStatus {
            passwords_at_limit: password_count >= FREE_PASSWORD_LIMIT,
            folders_at_limit: folder_count >= FREE_FOLDER_LIMIT,
        })
    })
}
