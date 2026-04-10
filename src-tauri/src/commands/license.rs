use serde::{Deserialize, Serialize};
use tauri::State;

use crate::database::Database;
use crate::state::{with_db, DbState};

const PRODUCT_PERMALINK: &str = "vaultz";
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
    let client = reqwest::Client::builder()
        .use_rustls_tls()
        .build()
        .map_err(|e| e.to_string())?;

    let params = [
        ("product_permalink", PRODUCT_PERMALINK),
        ("license_key", key.as_str()),
        ("increment_uses_count", "true"),
    ];

    let resp = client
        .post(GUMROAD_VERIFY_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let body: GumroadVerifyResponse = resp.json().await.map_err(|e| e.to_string())?;

    if !body.success {
        return Err("License key is invalid".to_string());
    }

    with_db(&db_state, |db| {
        db.store_license(&key).map_err(|e| e.to_string())
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
        ("product_permalink", PRODUCT_PERMALINK),
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
        // Network unreachable — honour the existing local state without evicting.
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub fn get_license_status(db_state: State<'_, DbState>) -> Result<LicenseStatus, String> {
    const SEVEN_DAYS_SECS: i64 = 7 * 24 * 60 * 60;

    with_db(&db_state, |db| {
        let is_active = match db.get_license().map_err(|e| e.to_string())? {
            None | Some((_, None)) => false,
            Some((_, Some(validated_at))) => {
                Database::now_unix() - validated_at <= SEVEN_DAYS_SECS
            }
        };

        Ok(LicenseStatus { is_active })
    })
}
