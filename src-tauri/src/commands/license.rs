use gethostname::gethostname;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::State;

use crate::database::{is_timestamp_within, Database, LICENSE_REVALIDATE_SECS};
use crate::state::{with_db, DbState};

const LS_ACTIVATE_URL: &str = "https://api.lemonsqueezy.com/v1/licenses/activate";
const LS_VALIDATE_URL: &str = "https://api.lemonsqueezy.com/v1/licenses/validate";
const LS_DEACTIVATE_URL: &str = "https://api.lemonsqueezy.com/v1/licenses/deactivate";

/// Wall-clock ceiling on a single Lemon Squeezy request (connect + read).
///
/// reqwest has no default timeout, so behind a black-holing proxy an
/// activate/validate/deactivate would hang for the OS TCP timeout (minutes).
/// A timeout is deliberately classified as a `TransportFailure`, never a
/// revocation: it becomes `FallBackToLocal`, which leaves
/// `license_validated_at` untouched and keeps the offline grace window intact.
const LS_REQUEST_TIMEOUT_SECS: u64 = 15;

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
    /// Optional per the Lemon Squeezy API — `license_key` alone is a valid request.
    /// Legacy rows stored before the `license_instance_id` migration have none, and
    /// must still be able to revalidate by key.
    #[serde(skip_serializing_if = "Option::is_none")]
    instance_id: Option<&'a str>,
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

/// Activation counts as reported by Lemon Squeezy: `(usage, limit)`.
///
/// A display nicety only — never an entitlement input, and deliberately not a
/// factor in the revalidation cadence (see `decide_validation`).
type ActivationCounts = (Option<u32>, Option<u32>);

fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .use_rustls_tls()
        .timeout(std::time::Duration::from_secs(LS_REQUEST_TIMEOUT_SECS))
        .build()
        .map_err(|e| e.to_string())
}

/// A successful Lemon Squeezy `/activate` response, reduced to what we store.
struct ActivationResult {
    instance_id: String,
    counts: Option<ActivationCounts>,
}

/// The single place that holds the LS `/activate` contract: POST, parse, and
/// require both `activated: true` and a non-null instance.
///
/// `log_ctx` names the caller in the log line — activation and instance-id
/// healing hit the same endpoint for very different reasons. The `Err` strings
/// are user-facing (`activate_license` returns them straight to the UI).
async fn post_activate(
    client: &reqwest::Client,
    key: &str,
    log_ctx: &str,
) -> Result<ActivationResult, String> {
    let hostname = gethostname().to_string_lossy().to_string();
    let body = LsActivateRequest {
        license_key: key,
        instance_name: hostname,
    };

    let resp = client
        .post(LS_ACTIVATE_URL)
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            eprintln!("[license] {}: HTTP request failed: {}", log_ctx, e);
            e.to_string()
        })?;

    let parsed: LsActivateResponse = resp.json().await.map_err(|e| {
        eprintln!(
            "[license] {}: failed to parse activate response: {}",
            log_ctx, e
        );
        e.to_string()
    })?;

    if !parsed.activated {
        eprintln!("[license] {}: LS returned activated=false", log_ctx);
        return Err("License key is invalid or already in use".to_string());
    }

    let instance_id = match parsed.instance {
        Some(inst) => inst.id,
        None => {
            eprintln!(
                "[license] {}: LS returned activated=true but instance was null",
                log_ctx
            );
            return Err("Activation failed: no instance ID returned".to_string());
        }
    };

    Ok(ActivationResult {
        instance_id,
        counts: parsed
            .license_key
            .map(|lk| (lk.activation_usage, lk.activation_limit)),
    })
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
    eprintln!(
        "[license] activate_license called with key: ...{}",
        redacted
    );

    let client = build_client()?;
    let result = post_activate(&client, &key, "activate_license").await?;

    eprintln!(
        "[license] license valid — storing in DB with instance_id={}",
        result.instance_id
    );
    with_db(&db_state, |db| {
        db.store_license(&key, &result.instance_id).map_err(|e| {
            eprintln!("[license] failed to store license: {}", e);
            e.to_string()
        })?;
        if let Some((usage, limit)) = result.counts {
            let _ = db.store_activation_counts(usage, limit);
        }
        Ok(())
    })
}

/// What to do *before* touching the network, decided purely from local state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ValidateDecision {
    /// Lemon Squeezy confirmed the license recently enough; don't ask again yet.
    SkipNetwork,
    /// Time to ask Lemon Squeezy.
    NeedsNetwork,
}

/// Pure pre-network decision, for a row that *does* have a license key.
///
/// `validated_at` is the last time LS *confirmed* the license, so the cadence
/// question is "did we ask within `LICENSE_REVALIDATE_SECS`?" — NOT the 30-day
/// grace window. Using the grace window here would mean an online user never
/// reaches the network path and a revoked license would keep working forever.
///
/// The timestamp is the *only* input. Cached activation counts deliberately do
/// not participate: they are a display nicety, and letting a missing/null count
/// force a network call meant every single invocation hit LS whenever the API
/// omitted `license_key` — multiplying request volume straight into rate-limit
/// (429) territory. Counts simply refresh whenever a network call happens
/// anyway, which populates pre-migration rows within a day.
fn decide_validation(validated_at: Option<i64>, now: i64) -> ValidateDecision {
    match validated_at {
        Some(ts) if is_timestamp_within(now, ts, LICENSE_REVALIDATE_SECS) => {
            ValidateDecision::SkipNetwork
        }
        _ => ValidateDecision::NeedsNetwork,
    }
}

/// What to send as `instance_id` on the validate request.
#[derive(Debug, Clone, PartialEq, Eq)]
enum InstancePlan {
    /// Use the stored instance id as-is.
    Stored(String),
    /// Legacy row with no (or empty) instance id: mint one first, then validate.
    /// Never a refusal — a row without an instance must still be able to
    /// revalidate, by key alone if healing fails.
    Heal,
}

/// Pure: decides how to obtain the `instance_id` for the validate request.
fn plan_instance(stored: Option<String>) -> InstancePlan {
    match stored {
        Some(id) if !id.is_empty() => InstancePlan::Stored(id),
        _ => InstancePlan::Heal,
    }
}

/// The outcome of a validate call, independent of HTTP plumbing.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum LsOutcome {
    /// LS answered 2xx with `valid: true`.
    Valid,
    /// LS answered 2xx with `valid: false` — revoked/refunded/deactivated.
    Invalid,
    /// LS answered with a status that means "I know this key and reject it"
    /// (deleted / not found / unprocessable). The body carries `{"error": ...}`
    /// and no `valid` field, so it can only be recognised by status.
    ClientRejected,
    /// 5xx, a proxy interstitial, rate limiting, an unparseable body, or a
    /// network error — we learned nothing.
    TransportFailure,
}

/// What the DB should do about an outcome.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum LicenseDbAction {
    /// Renew `license_validated_at` (and cache activation counts); report active.
    Confirm,
    /// Clear `license_validated_at`; report inactive.
    Revoke,
    /// Leave the DB alone and report whatever the local grace window says.
    FallBackToLocal,
}

/// Pure mapping from an LS outcome to the DB action. Only a *confirmed* answer
/// writes the timestamp — that is what keeps `license_validated_at` meaning
/// strictly "the last time LS said yes".
fn db_action_for(outcome: LsOutcome) -> LicenseDbAction {
    match outcome {
        LsOutcome::Valid => LicenseDbAction::Confirm,
        LsOutcome::Invalid | LsOutcome::ClientRejected => LicenseDbAction::Revoke,
        LsOutcome::TransportFailure => LicenseDbAction::FallBackToLocal,
    }
}

/// Classifies an HTTP status. `None` means "2xx — parse the body to learn more".
///
/// `ClientRejected` is a **destructive** verdict: it clears
/// `license_validated_at` and so destroys the 30-day offline grace buffer. Only
/// statuses that genuinely mean "Lemon Squeezy knows this key and rejects it"
/// may map to it — hence an explicit allowlist rather than the whole 4xx range.
///
/// Everything else, including these very much *transient* 4xx cases, is a
/// transport failure:
/// - **403** — a TLS-decrypting corporate proxy (Netskope and friends) serving
///   its own block page. reqwest sees a perfectly valid TLS response, not a
///   network error, so this arrives indistinguishable from an LS answer.
/// - **429** — LS rate limiting.
/// - **401 / 408 / 409** — auth/timeout/conflict at the edge, never a verdict on
///   the key itself.
///
/// Do not widen this back to a range: a paying customer behind a proxy would be
/// dropped to Free *and* stripped of the grace buffer that would otherwise have
/// rescued them.
fn classify_status(status: u16) -> Option<LsOutcome> {
    match status {
        200..=299 => None,
        400 | 404 | 422 => Some(LsOutcome::ClientRejected),
        _ => Some(LsOutcome::TransportFailure),
    }
}

/// Set once this process has attempted `instance_id` healing.
static HEAL_ATTEMPTED: AtomicBool = AtomicBool::new(false);

/// Claims the one-and-only healing attempt for this process.
///
/// Returns `true` for exactly one caller; every later caller gets `false`.
///
/// Healing mints a fresh Lemon Squeezy activation, i.e. it consumes a seat
/// against `activation_limit`. If the follow-up persist fails, the row keeps a
/// NULL `license_instance_id` and the next `validate_license` — which runs on
/// every unlock and every Settings mount — would mint *another* seat. A handful
/// of launches would exhaust a 3–5 seat limit, after which LS answers
/// `activated: false` forever and the orphan seats can only be cleaned up by
/// hand. One attempt per process caps the damage at one seat.
fn claim_heal_attempt(flag: &AtomicBool) -> bool {
    !flag.swap(true, Ordering::SeqCst)
}

/// Mints a fresh `instance_id` for a legacy license row that has none.
///
/// Rows stored before the `license_instance_id` migration validate by key alone,
/// which means the install is invisible to `activation_limit` and cannot be
/// revoked per-seat from the LS dashboard. So we re-activate once to heal it.
///
/// Returns `None` when activation fails for any reason — notably
/// `activated: false` because the activation limit is already reached. The caller
/// then falls back to key-only validation: healing is best-effort and must never
/// lock a paying user out.
async fn mint_instance_id(client: &reqwest::Client, key: &str) -> Option<String> {
    match post_activate(client, key, "instance_id healing").await {
        Ok(result) => Some(result.instance_id),
        Err(e) => {
            eprintln!(
                "[license] instance_id healing: {} — falling back to key-only validation",
                e
            );
            None
        }
    }
}

/// Releases an activation seat we minted but could not persist.
///
/// Without this the seat is orphaned: nothing locally remembers the instance id,
/// so neither `deactivate_license` nor a later heal can ever give it back.
/// Best-effort — the outcome is logged either way.
async fn release_instance(client: &reqwest::Client, key: &str, instance_id: &str) {
    let body = LsDeactivateRequest {
        license_key: key,
        instance_id,
    };
    match client.post(LS_DEACTIVATE_URL).json(&body).send().await {
        Ok(resp) => eprintln!(
            "[license] instance_id healing: released orphan seat {} (HTTP {})",
            instance_id,
            resp.status().as_u16()
        ),
        Err(e) => eprintln!(
            "[license] instance_id healing: failed to release orphan seat {}: {}",
            instance_id, e
        ),
    }
}

/// Applies a decided `LicenseDbAction` and reports the resulting entitlement.
///
/// Split out of `validate_license` so the *effects* are testable against a real
/// (in-memory) `Database` without a Tauri harness. The decision functions above
/// are pure; this is the only place where a validation outcome touches the DB.
fn apply_db_action(
    db: &Database,
    action: LicenseDbAction,
    counts: Option<ActivationCounts>,
) -> Result<bool, String> {
    match action {
        LicenseDbAction::Confirm => {
            // The rolling window: a confirmed "yes" restarts the 30-day grace.
            // Removing this touch is precisely the original bug — a Pro license
            // silently reverting to Free once the initial activation aged out.
            db.touch_license_validated_at().map_err(|e| e.to_string())?;
            if let Some((usage, limit)) = counts {
                let _ = db.store_activation_counts(usage, limit);
            }
            Ok(true)
        }
        LicenseDbAction::Revoke => {
            db.clear_license_validated_at().map_err(|e| e.to_string())?;
            Ok(false)
        }
        // Offline / transport failure: report the local grace state rather than
        // claiming the license is valid unconditionally — and write nothing, so
        // the grace window neither extends nor collapses.
        LicenseDbAction::FallBackToLocal => Ok(db.is_license_active()),
    }
}

/// Outcome of the local-only phase of `validate_license`.
#[derive(Debug, Clone, PartialEq, Eq)]
enum LocalPhase {
    /// Answerable without the network, and without writing anything.
    Settled(bool),
    /// Ask Lemon Squeezy, using this key and stored instance id.
    NeedsNetwork {
        key: String,
        instance_id: Option<String>,
    },
}

/// Everything `validate_license` can decide before touching the network.
///
/// Extracted from the command so the three no-network arms are testable against a
/// real (in-memory) `Database` — in particular that `Settled` writes *nothing*:
/// skipping the network must never renew `license_validated_at`, or an online user
/// would roll their own grace window forward without LS ever confirming anything.
fn resolve_locally(db: &Database, now: i64) -> Result<LocalPhase, String> {
    // No license row (or an empty key) means the user is on Free — nothing to
    // validate, and nothing in the DB to touch.
    let Some((key, validated_at, instance_id)) = db.get_license().map_err(|e| e.to_string())?
    else {
        return Ok(LocalPhase::Settled(false));
    };
    if key.is_empty() {
        return Ok(LocalPhase::Settled(false));
    }

    match decide_validation(validated_at, now) {
        // Deliberately does NOT renew the timestamp: only a confirmed answer from
        // Lemon Squeezy may do that.
        ValidateDecision::SkipNetwork => Ok(LocalPhase::Settled(true)),
        ValidateDecision::NeedsNetwork => Ok(LocalPhase::NeedsNetwork { key, instance_id }),
    }
}

#[tauri::command]
pub async fn validate_license(db_state: State<'_, DbState>) -> Result<bool, String> {
    let now = Database::now_unix();
    let (key, instance_id) = match with_db(&db_state, |db| resolve_locally(db, now))? {
        LocalPhase::Settled(is_active) => return Ok(is_active),
        LocalPhase::NeedsNetwork { key, instance_id } => (key, instance_id),
    };

    let client = build_client()?;

    // `instance_id` is optional for /v1/licenses/validate, so a legacy row without
    // one still validates by key alone — but heal it first if we can.
    let instance_id = match plan_instance(instance_id) {
        InstancePlan::Stored(id) => Some(id),
        InstancePlan::Heal => {
            if !claim_heal_attempt(&HEAL_ATTEMPTED) {
                eprintln!(
                    "[license] instance_id healing: already attempted in this process \
                     — validating by key alone"
                );
                None
            } else {
                match mint_instance_id(&client, &key).await {
                    Some(minted) => {
                        // Writes ONLY the instance id: `license_validated_at` must
                        // stay owned by `touch_license_validated_at` alone.
                        match with_db(&db_state, |db| {
                            db.store_license_instance_id(&minted)
                                .map_err(|e| e.to_string())
                        }) {
                            Ok(()) => Some(minted),
                            Err(e) => {
                                eprintln!(
                                    "[license] instance_id healing: failed to persist \
                                     minted instance: {}",
                                    e
                                );
                                release_instance(&client, &key, &minted).await;
                                None
                            }
                        }
                    }
                    None => None,
                }
            }
        }
    };

    let body = LsValidateRequest {
        license_key: &key,
        instance_id: instance_id.as_deref(),
    };

    // Activation counts ride along with a 2xx body; cached only on a confirmed yes.
    let mut counts: Option<ActivationCounts> = None;

    let outcome = match client.post(LS_VALIDATE_URL).json(&body).send().await {
        Ok(resp) => {
            let status = resp.status().as_u16();
            match classify_status(status) {
                Some(outcome) => {
                    eprintln!("[license] validate_license HTTP {} → {:?}", status, outcome);
                    outcome
                }
                None => match resp.json::<LsValidateResponse>().await {
                    Ok(parsed) => {
                        counts = parsed
                            .license_key
                            .as_ref()
                            .map(|lk| (lk.activation_usage, lk.activation_limit));
                        if parsed.valid {
                            LsOutcome::Valid
                        } else {
                            LsOutcome::Invalid
                        }
                    }
                    Err(e) => {
                        // A 2xx we cannot read tells us nothing — do not downgrade.
                        eprintln!("[license] validate_license unparseable body: {}", e);
                        LsOutcome::TransportFailure
                    }
                },
            }
        }
        Err(e) => {
            eprintln!("[license] validate_license network error: {}", e);
            LsOutcome::TransportFailure
        }
    };

    let action = db_action_for(outcome);
    with_db(&db_state, |db| apply_db_action(db, action, counts))
}

#[tauri::command]
pub async fn deactivate_license(db_state: State<'_, DbState>) -> Result<(), String> {
    let license_info = with_db(&db_state, |db| db.get_license().map_err(|e| e.to_string()))?;

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
    let _ = client.post(LS_DEACTIVATE_URL).json(&body).send().await;

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::test_helpers::in_memory_db;
    use crate::database::{LICENSE_GRACE_SECS, LICENSE_REVALIDATE_SECS};

    const NOW: i64 = 1_700_000_000;
    const DAY: i64 = 24 * 60 * 60;

    #[test]
    fn decide_validation_table() {
        let cases: &[(&str, Option<i64>, i64, ValidateDecision)] = &[
            (
                "confirmed an hour ago → don't ask LS again",
                Some(NOW - 3600),
                NOW,
                ValidateDecision::SkipNetwork,
            ),
            (
                "confirmed exactly at the revalidate boundary → still skip",
                Some(NOW - LICENSE_REVALIDATE_SECS),
                NOW,
                ValidateDecision::SkipNetwork,
            ),
            (
                "one second past the revalidate boundary → ask LS",
                Some(NOW - LICENSE_REVALIDATE_SECS - 1),
                NOW,
                ValidateDecision::NeedsNetwork,
            ),
            (
                "inside the 30-day grace but past 24h → ask LS (revocation must be seen)",
                Some(NOW - 8 * DAY),
                NOW,
                ValidateDecision::NeedsNetwork,
            ),
            (
                "never validated → ask LS",
                None,
                NOW,
                ValidateDecision::NeedsNetwork,
            ),
            (
                "future timestamp beyond skew → ask LS, cannot suppress the check",
                Some(NOW + 10 * DAY),
                NOW,
                ValidateDecision::NeedsNetwork,
            ),
            (
                "i64::MIN timestamp → ask LS, no overflow",
                Some(i64::MIN),
                NOW,
                ValidateDecision::NeedsNetwork,
            ),
            (
                "i64::MAX timestamp → ask LS, no overflow",
                Some(i64::MAX),
                NOW,
                ValidateDecision::NeedsNetwork,
            ),
        ];

        for (name, validated_at, now, expected) in cases {
            assert_eq!(
                decide_validation(*validated_at, *now),
                *expected,
                "case: {name}"
            );
        }
    }

    #[test]
    fn activation_counts_do_not_affect_the_revalidate_cadence() {
        // Counts are a display nicety. When they gated the cadence, an LS answer
        // that omitted `license_key` meant EVERY call went to the network — the
        // fastest route to a 429, which G1 shows is dangerous. The timestamp is
        // now the only input, so there is nothing left for counts to force.
        assert_eq!(
            decide_validation(Some(NOW - 3600), NOW),
            ValidateDecision::SkipNetwork
        );
    }

    #[test]
    fn revalidate_cadence_is_far_shorter_than_the_grace_window() {
        // The whole point of the two constants: an online user is asked often, an
        // offline user is trusted long. This *relationship* is load-bearing, not a
        // coincidence of today's values — it is the invariant the whole design
        // rests on, and iteration 1 of this fix regressed precisely by letting the
        // two reconverge.
        //
        // If they ever became equal or inverted, the original bug returns
        // silently: `resolve_locally` would skip the network for as long as we
        // trust the last yes, so the `validate_license` network path becomes
        // unreachable — revocation is never detected, and the grace window is
        // never refreshed, so Pro lapses mid-session. In the inverted direction
        // the grace window would no longer cover the offline stretch between two
        // scheduled asks, which is exactly what grace exists for.
        assert!(LICENSE_REVALIDATE_SECS < LICENSE_GRACE_SECS);
    }

    #[test]
    fn plan_instance_table() {
        // A legacy row must never be refused: the plan is always to validate, with
        // a healing attempt first. An early `return Ok(false)` here would lock a
        // paying user out of Pro.
        assert_eq!(
            plan_instance(Some("inst-1".to_string())),
            InstancePlan::Stored("inst-1".to_string())
        );
        assert_eq!(plan_instance(None), InstancePlan::Heal);
        assert_eq!(plan_instance(Some(String::new())), InstancePlan::Heal);
    }

    #[test]
    fn db_action_for_table() {
        let cases: &[(&str, LsOutcome, LicenseDbAction)] = &[
            (
                "LS says valid → renew the timestamp",
                LsOutcome::Valid,
                LicenseDbAction::Confirm,
            ),
            (
                "LS says invalid → clear the timestamp immediately",
                LsOutcome::Invalid,
                LicenseDbAction::Revoke,
            ),
            (
                "LS rejects a key it knows (400/404/422) → treat as revocation",
                LsOutcome::ClientRejected,
                LicenseDbAction::Revoke,
            ),
            (
                "network error / 5xx / proxy block / rate limit → honest local fallback",
                LsOutcome::TransportFailure,
                LicenseDbAction::FallBackToLocal,
            ),
        ];

        for (name, outcome, expected) in cases {
            assert_eq!(db_action_for(*outcome), *expected, "case: {name}");
        }
    }

    #[test]
    fn classify_status_table() {
        let cases: &[(&str, u16, Option<LsOutcome>)] = &[
            ("2xx → read the body", 200, None),
            ("top of the 2xx range → read the body", 299, None),
            (
                "400 bad request: LS knows the key and rejects it",
                400,
                Some(LsOutcome::ClientRejected),
            ),
            (
                "404 not found: the key was deleted",
                404,
                Some(LsOutcome::ClientRejected),
            ),
            (
                "422 unprocessable: LS rejects the key itself",
                422,
                Some(LsOutcome::ClientRejected),
            ),
            (
                "401 unauthorized at the edge is not a verdict on the key",
                401,
                Some(LsOutcome::TransportFailure),
            ),
            (
                "403: TLS-decrypting corporate proxy (Netskope) block page, \
                 NOT a revoked license",
                403,
                Some(LsOutcome::TransportFailure),
            ),
            (
                "408 request timeout is transport, not a verdict",
                408,
                Some(LsOutcome::TransportFailure),
            ),
            (
                "409 conflict is transport, not a verdict",
                409,
                Some(LsOutcome::TransportFailure),
            ),
            (
                "429: LS rate limiting — must never revoke a paying customer",
                429,
                Some(LsOutcome::TransportFailure),
            ),
            (
                "499 is not a real LS verdict",
                499,
                Some(LsOutcome::TransportFailure),
            ),
            ("500", 500, Some(LsOutcome::TransportFailure)),
            ("503", 503, Some(LsOutcome::TransportFailure)),
            ("302 redirect", 302, Some(LsOutcome::TransportFailure)),
        ];

        for (name, status, expected) in cases {
            assert_eq!(
                classify_status(*status),
                *expected,
                "case: {name} ({status})"
            );
        }
    }

    #[test]
    fn a_recognised_client_rejection_never_falls_back_to_the_local_grace_state() {
        // A deleted key returns 400 with no `valid` field, which must downgrade to
        // Free rather than be swallowed as a transport failure.
        let outcome = classify_status(400).expect("4xx is decided by status alone");
        assert_eq!(db_action_for(outcome), LicenseDbAction::Revoke);
    }

    #[test]
    fn a_proxy_block_or_rate_limit_never_revokes_the_license() {
        // The destructive path (Revoke clears `license_validated_at` and with it the
        // 30-day offline buffer) must be unreachable from a transient network
        // condition. 403 = corporate TLS-decrypting proxy interstitial,
        // 429 = LS rate limiting.
        for status in [403u16, 429] {
            let outcome = classify_status(status).expect("non-2xx is decided by status alone");
            assert_eq!(
                db_action_for(outcome),
                LicenseDbAction::FallBackToLocal,
                "status {status} must not revoke"
            );
        }
    }

    #[test]
    fn validate_request_omits_instance_id_when_absent() {
        // Serialization against the real API: LS rejects `"instance_id": null`, so
        // the field must disappear entirely for a legacy key-only validation.
        let body = LsValidateRequest {
            license_key: "k",
            instance_id: None,
        };
        assert_eq!(
            serde_json::to_string(&body).unwrap(),
            r#"{"license_key":"k"}"#
        );
    }

    #[test]
    fn validate_request_includes_instance_id_when_present() {
        let body = LsValidateRequest {
            license_key: "k",
            instance_id: Some("inst-1"),
        };
        assert_eq!(
            serde_json::to_string(&body).unwrap(),
            r#"{"license_key":"k","instance_id":"inst-1"}"#
        );
    }

    #[test]
    fn claim_heal_attempt_succeeds_exactly_once() {
        // Uses a local flag so the process-wide HEAL_ATTEMPTED stays untouched.
        let flag = AtomicBool::new(false);
        assert!(claim_heal_attempt(&flag), "the first caller may heal");
        assert!(!claim_heal_attempt(&flag), "the second caller may not");
        assert!(!claim_heal_attempt(&flag), "and never again");
    }

    // --- resolve_locally: the no-network arms, and what they must NOT write ---

    #[test]
    fn resolve_locally_reports_free_when_there_is_no_license_row() {
        let db = in_memory_db();
        assert_eq!(
            resolve_locally(&db, Database::now_unix()).unwrap(),
            LocalPhase::Settled(false),
            "no license row must report Free, never Pro"
        );
    }

    #[test]
    fn resolve_locally_reports_free_for_an_empty_key() {
        let db = in_memory_db();
        db.store_license("", "inst-empty").unwrap();
        assert_eq!(
            resolve_locally(&db, Database::now_unix()).unwrap(),
            LocalPhase::Settled(false)
        );
    }

    #[test]
    fn resolve_locally_skips_the_network_within_the_cadence_and_writes_nothing() {
        let db = in_memory_db();
        db.store_license("KEY-FRESH", "inst-fresh").unwrap();
        let now = Database::now_unix();
        let ts = now - 3600;
        db.set_license_validated_at_for_test(Some(ts)).unwrap();

        assert_eq!(
            resolve_locally(&db, now).unwrap(),
            LocalPhase::Settled(true),
            "inside the 24h cadence the license is Pro without asking LS"
        );
        assert_eq!(
            db.get_license().unwrap().unwrap().1,
            Some(ts),
            "skipping the network must NOT renew license_validated_at — only a \
             confirmed yes from LS may move it"
        );
    }

    #[test]
    fn resolve_locally_asks_lemon_squeezy_once_past_the_cadence() {
        let db = in_memory_db();
        db.store_license("KEY-STALE", "inst-stale").unwrap();
        let now = Database::now_unix();
        db.set_license_validated_at_for_test(Some(now - LICENSE_REVALIDATE_SECS - 1))
            .unwrap();

        assert_eq!(
            resolve_locally(&db, now).unwrap(),
            LocalPhase::NeedsNetwork {
                key: "KEY-STALE".to_string(),
                instance_id: Some("inst-stale".to_string()),
            }
        );
    }

    #[test]
    fn resolve_locally_asks_lemon_squeezy_for_a_legacy_row_with_no_instance_id() {
        // A lapsed legacy row must still reach the network (and then healing) rather
        // than being settled as Free locally.
        let db = in_memory_db();
        db.store_license("KEY-LEGACY", "").unwrap();
        let now = Database::now_unix();
        db.set_license_validated_at_for_test(Some(now - LICENSE_GRACE_SECS - DAY))
            .unwrap();

        assert_eq!(
            resolve_locally(&db, now).unwrap(),
            LocalPhase::NeedsNetwork {
                key: "KEY-LEGACY".to_string(),
                instance_id: Some(String::new()),
            }
        );
    }

    // --- apply_db_action: the *effects* of each decision ---------------------

    #[test]
    fn confirm_renews_the_timestamp_stores_counts_and_reports_active() {
        let db = in_memory_db();
        db.store_license("KEY-CONFIRM", "inst-confirm").unwrap();
        db.set_license_validated_at_for_test(Some(Database::now_unix() - 10 * DAY))
            .unwrap();
        let before = db.get_license().unwrap().unwrap().1.unwrap();

        let active =
            apply_db_action(&db, LicenseDbAction::Confirm, Some((Some(2), Some(5)))).unwrap();

        assert!(active, "a confirmed license reports active");
        let after = db.get_license().unwrap().unwrap().1.unwrap();
        assert!(
            after > before,
            "Confirm must renew license_validated_at ({after} should be newer than {before})"
        );
        assert_eq!(db.get_activation_counts().unwrap(), (Some(2), Some(5)));
    }

    #[test]
    fn confirm_reactivates_a_lapsed_license() {
        // End-to-end proof of the rolling window, and the regression guard for the
        // original bug: a license whose last confirmation aged past the 30-day
        // grace is inactive, and a fresh "yes" from LS must bring it back.
        let db = in_memory_db();
        db.store_license("KEY-LAPSED", "inst-lapsed").unwrap();
        db.set_license_validated_at_for_test(Some(Database::now_unix() - LICENSE_GRACE_SECS - DAY))
            .unwrap();
        assert!(
            !db.is_license_active(),
            "precondition: the license has lapsed"
        );

        let active = apply_db_action(&db, LicenseDbAction::Confirm, None).unwrap();

        assert!(active);
        assert!(
            db.is_license_active(),
            "a confirmed yes must restart the grace window"
        );
    }

    #[test]
    fn confirm_without_counts_still_renews_the_timestamp() {
        let db = in_memory_db();
        db.store_license("KEY-NOCOUNTS", "inst-nocounts").unwrap();
        db.set_license_validated_at_for_test(None).unwrap();

        let active = apply_db_action(&db, LicenseDbAction::Confirm, None).unwrap();

        assert!(active);
        assert!(db.get_license().unwrap().unwrap().1.is_some());
        assert!(db.is_license_active());
    }

    #[test]
    fn revoke_clears_the_timestamp_deactivates_and_keeps_the_key() {
        let db = in_memory_db();
        db.store_license("KEY-REVOKE", "inst-revoke").unwrap();
        assert!(db.is_license_active(), "precondition: active");

        let active = apply_db_action(&db, LicenseDbAction::Revoke, None).unwrap();

        assert!(!active, "a revoked license reports inactive");
        let (key, validated_at, instance_id) = db.get_license().unwrap().unwrap();
        assert_eq!(
            validated_at, None,
            "Revoke must clear license_validated_at, collapsing the grace window"
        );
        assert!(!db.is_license_active());
        // The key (and instance) survive so the user can see / deactivate it.
        assert_eq!(key, "KEY-REVOKE");
        assert_eq!(instance_id, Some("inst-revoke".to_string()));
    }

    #[test]
    fn fall_back_to_local_reports_the_grace_state_without_writing() {
        let db = in_memory_db();
        db.store_license("KEY-OFFLINE", "inst-offline").unwrap();
        let ts = Database::now_unix() - 10 * DAY;
        db.set_license_validated_at_for_test(Some(ts)).unwrap();

        let active = apply_db_action(&db, LicenseDbAction::FallBackToLocal, None).unwrap();

        assert!(active, "10 days into the 30-day grace window is still Pro");
        assert_eq!(
            db.get_license().unwrap().unwrap().1,
            Some(ts),
            "a transport failure must not touch license_validated_at"
        );
    }

    #[test]
    fn fall_back_to_local_reports_inactive_once_the_grace_window_has_lapsed() {
        let db = in_memory_db();
        db.store_license("KEY-LAPSED-OFFLINE", "inst-lapsed-offline")
            .unwrap();
        let ts = Database::now_unix() - LICENSE_GRACE_SECS - DAY;
        db.set_license_validated_at_for_test(Some(ts)).unwrap();

        let active = apply_db_action(&db, LicenseDbAction::FallBackToLocal, None).unwrap();

        assert!(!active);
        assert_eq!(db.get_license().unwrap().unwrap().1, Some(ts));
    }

    #[test]
    fn fall_back_to_local_does_not_store_counts() {
        // Counts are only cached on a confirmed yes; a transport failure carries no
        // trustworthy body to cache.
        let db = in_memory_db();
        db.store_license("KEY-NOWRITE", "inst-nowrite").unwrap();

        apply_db_action(
            &db,
            LicenseDbAction::FallBackToLocal,
            Some((Some(9), Some(9))),
        )
        .unwrap();

        assert_eq!(db.get_activation_counts().unwrap(), (None, None));
    }
}
