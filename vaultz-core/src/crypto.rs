use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit, Nonce};
use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use password_hash::rand_core::{OsRng, RngCore};

// ── Constants ─────────────────────────────────────────────────────────────────

pub const ENC_PREFIX: &str = "ENC:";
pub const MAGIC: &[u8] = b"PMVAULT1";
pub const VAULT_SALT_LEN: usize = 16;
pub const NONCE_LEN: usize = 12;
pub const KEY_LEN: usize = 32;
pub const HEADER_LEN: usize = MAGIC.len() + VAULT_SALT_LEN + NONCE_LEN;

// ── Key derivation ────────────────────────────────────────────────────────────

pub fn derive_key(password: &[u8], salt: &[u8]) -> Result<[u8; KEY_LEN], String> {
    let mut key = [0u8; KEY_LEN];
    Argon2::default()
        .hash_password_into(password, salt, &mut key)
        .map_err(|e| format!("Key derivation failed: {}", e))?;
    Ok(key)
}

// ── Field-level encrypt / decrypt ─────────────────────────────────────────────

pub fn encrypt_field(key: &[u8; KEY_LEN], plaintext: &str) -> Result<String, String> {
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| format!("cipher init: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("encrypt: {}", e))?;
    Ok(format!(
        "{}{}.{}",
        ENC_PREFIX,
        BASE64.encode(nonce_bytes),
        BASE64.encode(ciphertext)
    ))
}

pub fn decrypt_field(key: &[u8; KEY_LEN], value: &str) -> Result<String, String> {
    if !value.starts_with(ENC_PREFIX) {
        return Ok(value.to_string()); // legacy plaintext
    }
    let encoded = &value[ENC_PREFIX.len()..];
    let dot = encoded
        .find('.')
        .ok_or_else(|| "Malformed encrypted field".to_string())?;
    let nonce_bytes = BASE64
        .decode(&encoded[..dot])
        .map_err(|e| format!("Invalid nonce: {}", e))?;
    let ciphertext = BASE64
        .decode(&encoded[dot + 1..])
        .map_err(|e| format!("Invalid ciphertext: {}", e))?;
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| format!("cipher init: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "Decryption failed — data may be corrupt".to_string())?;
    String::from_utf8(plaintext).map_err(|_| "Decrypted data is not valid UTF-8".to_string())
}

// ── Vault-level encrypt / decrypt (for export/import) ────────────────────────

pub fn encrypt_vault(passphrase: &str, plaintext: &[u8]) -> Result<Vec<u8>, String> {
    let mut salt = [0u8; VAULT_SALT_LEN];
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce_bytes);

    let key = derive_key(passphrase.as_bytes(), &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("cipher init: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let mut output = Vec::with_capacity(HEADER_LEN + ciphertext.len());
    output.extend_from_slice(MAGIC);
    output.extend_from_slice(&salt);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);
    Ok(output)
}

pub fn decrypt_vault(passphrase: &str, data: &[u8]) -> Result<Vec<u8>, String> {
    if data.len() < HEADER_LEN {
        return Err("File too small to be a valid vault".to_string());
    }
    if &data[..MAGIC.len()] != MAGIC {
        return Err("Not a valid .pmvault file".to_string());
    }

    let salt = &data[MAGIC.len()..MAGIC.len() + VAULT_SALT_LEN];
    let nonce_bytes = &data[MAGIC.len() + VAULT_SALT_LEN..HEADER_LEN];
    let ciphertext = &data[HEADER_LEN..];

    let key = derive_key(passphrase.as_bytes(), salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("cipher init: {}", e))?;
    let nonce = Nonce::from_slice(nonce_bytes);
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Decryption failed — wrong passphrase or corrupted file".to_string())
}
