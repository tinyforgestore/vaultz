//! Centralized window labels and event names used by Tauri commands and the
//! frontend. Frontend mirror lives at `src/constants/events.ts`.

pub const MAIN: &str = "main";
pub const OVERLAY_SEARCH: &str = "overlay-search";
pub const OVERLAY_GENERATOR: &str = "overlay-generator";

pub const VAULT_LOCKED: &str = "vault-locked";
pub const VAULT_UNLOCKED: &str = "vault-unlocked";
pub const PASSWORDS_CHANGED: &str = "passwords-changed";
pub const GENERATED_PASSWORDS_CHANGED: &str = "generated-passwords-changed";
pub const OPEN_CREATE_ENTRY_PREFILLED: &str = "open-create-entry-prefilled";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn window_labels_are_stable() {
        assert_eq!(MAIN, "main");
        assert_eq!(OVERLAY_SEARCH, "overlay-search");
        assert_eq!(OVERLAY_GENERATOR, "overlay-generator");
    }

    #[test]
    fn event_names_are_stable() {
        assert_eq!(VAULT_LOCKED, "vault-locked");
        assert_eq!(VAULT_UNLOCKED, "vault-unlocked");
        assert_eq!(PASSWORDS_CHANGED, "passwords-changed");
        assert_eq!(GENERATED_PASSWORDS_CHANGED, "generated-passwords-changed");
        assert_eq!(OPEN_CREATE_ENTRY_PREFILLED, "open-create-entry-prefilled");
    }
}
