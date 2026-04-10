use serde::{Deserialize, Serialize};
use tauri::State;

use crate::database::Database;
use crate::state::{with_db, DbState};

const PRODUCT_ID: &str = "OqW5bpeiBnl32UJLMJsUTg==";
const GUMROAD_VERIFY_URL: &str = "https://api.gumroad.com/v2/licenses/verify";

pub const FREE_PASSWORD_LIMIT: i64 = 20;
pub const FREE_FOLDER_LIMIT: i64 = 5;

#[derive(Deserialize)]
struct GumroadVerifyResponse {
    success: bool,
}

#[derive(Serialize)]
pub struct LicenseStatus {
    pub is_active: bool,
}

#[tauri::command]
pub async fn activate_license(key: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let redacted = key.chars().rev().take(4).collect::<String>().chars().rev().collect::<String>();
    eprintln!("[license] activate_license called with key: ...{}", redacted);

    let client = reqwest::Client::builder()
        .use_rustls_tls()
        .build()
        .map_err(|e| {
            eprintln!("[license] failed to build HTTP client: {}", e);
            e.to_string()
        })?;

    let params = [
        ("product_id", PRODUCT_ID),
        ("license_key", key.as_str()),
        ("increment_uses_count", "true"),
    ];

    let resp = client
        .post(GUMROAD_VERIFY_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| {
            eprintln!("[license] HTTP request failed: {}", e);
            e.to_string()
        })?;

    let body: GumroadVerifyResponse = resp.json().await.map_err(|e| {
        eprintln!("[license] failed to parse response JSON: {}", e);
        e.to_string()
    })?;

    if !body.success {
        eprintln!("[license] Gumroad returned success=false");
        return Err("License key is invalid".to_string());
    }

    eprintln!("[license] license valid — storing in DB");
    with_db(&db_state, |db| {
        db.store_license(&key).map_err(|e| {
            eprintln!("[license] failed to store license: {}", e);
            e.to_string()
        })
    })
}

/// Re-validates the stored license key against Gumroad.
///
/// Note: `increment_uses_count` is intentionally omitted here — it should only
/// fire on first activation (`activate_license`), not on periodic re-validation.
#[tauri::command]
pub async fn validate_license(db_state: State<'_, DbState>) -> Result<bool, String> {
    const SEVEN_DAYS_SECS: i64 = 7 * 24 * 60 * 60;

    // Read stored license info synchronously first.
    let license_info = with_db(&db_state, |db| {
        db.get_license().map_err(|e| e.to_string())
    })?;

    let (key, validated_at) = match license_info {
        None => return Ok(false),
        Some((k, v)) => (k, v),
    };

    let now = Database::now_unix();

    // If within 7-day window, skip network call.
    if let Some(ts) = validated_at {
        if now - ts <= SEVEN_DAYS_SECS {
            return Ok(true);
        }
    }

    // Outside window — re-validate against Gumroad.
    let client = reqwest::Client::builder()
        .use_rustls_tls()
        .build()
        .map_err(|e| e.to_string())?;

    let params = [
        ("product_id", PRODUCT_ID),
        ("license_key", key.as_str()),
    ];

    let result = client
        .post(GUMROAD_VERIFY_URL)
        .form(&params)
        .send()
        .await;

    match result {
        Ok(resp) => {
            let body: GumroadVerifyResponse = resp.json().await.map_err(|e| e.to_string())?;
            if body.success {
                with_db(&db_state, |db| {
                    db.touch_license_validated_at().map_err(|e| e.to_string())
                })?;
                Ok(true)
            } else {
                // Gumroad explicitly rejected the license (revoked/refunded) — evict it
                // immediately so the next local check also returns inactive.
                with_db(&db_state, |db| {
                    db.clear_license_validated_at().map_err(|e| e.to_string())
                })?;
                Ok(false)
            }
        }
        // Network unreachable — treat as valid so a transient outage doesn't
        // evict a legitimately activated license. The DB timestamp is not updated,
        // so the next online re-validation will still contact Gumroad.
        Err(e) => {
            eprintln!("[license] validate_license network error: {}", e);
            Ok(true)
        }
    }
}

#[tauri::command]
pub fn get_license_status(db_state: State<'_, DbState>) -> Result<LicenseStatus, String> {
    with_db(&db_state, |db| {
        Ok(LicenseStatus {
            is_active: db.is_license_active(),
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
