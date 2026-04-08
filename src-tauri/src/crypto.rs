use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit, Nonce};
use argon2::{Argon2, PasswordHasher, PasswordVerifier};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use password_hash::{rand_core::OsRng, PasswordHash, SaltString};
use password_hash::rand_core::RngCore;

const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;
pub const ENC_PREFIX: &str = "ENC:";

pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| e.to_string())
        .map(|h| h.to_string())
}

pub fn verify_password_hash(password: &str, hash: &str) -> Result<bool, String> {
    let parsed = PasswordHash::new(hash).map_err(|e| e.to_string())?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

pub fn derive_field_key(master_password: &[u8], salt: &[u8]) -> Result<[u8; KEY_LEN], String> {
    let mut key = [0u8; KEY_LEN];
    Argon2::default()
        .hash_password_into(master_password, salt, &mut key)
        .map_err(|e| format!("key derivation: {}", e))?;
    Ok(key)
}

pub fn encrypt_field(key: &[u8; KEY_LEN], plaintext: &str) -> Result<String, String> {
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);

    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|_| "encryption failed".to_string())?;

    Ok(format!(
        "{}{}.{}",
        ENC_PREFIX,
        BASE64.encode(nonce_bytes),
        BASE64.encode(ciphertext)
    ))
}

pub fn decrypt_field(key: &[u8; KEY_LEN], value: &str) -> Result<String, String> {
    if !value.starts_with(ENC_PREFIX) {
        // Legacy plaintext — pass through during migration window
        return Ok(value.to_string());
    }

    let encoded = &value[ENC_PREFIX.len()..];
    let dot = encoded.find('.').ok_or("invalid encrypted field format")?;
    let nonce_bytes = BASE64.decode(&encoded[..dot]).map_err(|e| e.to_string())?;
    let ciphertext = BASE64.decode(&encoded[dot + 1..]).map_err(|e| e.to_string())?;

    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "field decryption failed".to_string())?;

    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_key() -> [u8; KEY_LEN] {
        let master = b"test-master-password";
        let salt = b"test-salt-16byte";
        derive_field_key(master, salt).expect("key derivation failed")
    }

    #[test]
    fn encrypt_decrypt_round_trip() {
        let key = test_key();
        let plaintext = "my secret password";
        let encrypted = encrypt_field(&key, plaintext).expect("encrypt failed");
        assert!(encrypted.starts_with(ENC_PREFIX));
        let decrypted = decrypt_field(&key, &encrypted).expect("decrypt failed");
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn encrypt_produces_different_ciphertext_each_time() {
        let key = test_key();
        let plaintext = "same input";
        let a = encrypt_field(&key, plaintext).unwrap();
        let b = encrypt_field(&key, plaintext).unwrap();
        // Random nonce means output differs
        assert_ne!(a, b);
    }

    #[test]
    fn wrong_key_fails_decryption() {
        let key = test_key();
        let wrong_key = [0u8; KEY_LEN];
        let encrypted = encrypt_field(&key, "secret").unwrap();
        let result = decrypt_field(&wrong_key, &encrypted);
        assert!(result.is_err());
    }

    #[test]
    fn plaintext_without_prefix_passes_through() {
        let key = test_key();
        let legacy = "plaintext-no-prefix";
        let result = decrypt_field(&key, legacy).unwrap();
        assert_eq!(result, legacy);
    }

    #[test]
    fn empty_plaintext_round_trips() {
        let key = test_key();
        let encrypted = encrypt_field(&key, "").unwrap();
        let decrypted = decrypt_field(&key, &encrypted).unwrap();
        assert_eq!(decrypted, "");
    }

    #[test]
    fn hash_and_verify_password() {
        let hash = hash_password("correct-horse-battery").expect("hash failed");
        assert!(verify_password_hash("correct-horse-battery", &hash).unwrap());
        assert!(!verify_password_hash("wrong-password", &hash).unwrap());
    }

    #[test]
    fn derive_field_key_is_deterministic() {
        let master = b"password";
        let salt = b"salt-16-bytes-ok";
        let key1 = derive_field_key(master, salt).unwrap();
        let key2 = derive_field_key(master, salt).unwrap();
        assert_eq!(key1, key2);
    }

    #[test]
    fn derive_field_key_differs_with_different_salt() {
        let master = b"password";
        let key1 = derive_field_key(master, b"salt-aaaaaaaaaaaa").unwrap();
        let key2 = derive_field_key(master, b"salt-bbbbbbbbbbbb").unwrap();
        assert_ne!(key1, key2);
    }
}
