// Verifies a .pmvault export file by decrypting it and checking
// that the plaintext is a valid SQLite database.
//
// Usage:
//   cargo run --manifest-path scripts/verify-vault/Cargo.toml -- <vault-file> <passphrase>
//
// Example:
//   cargo run --manifest-path scripts/verify-vault/Cargo.toml -- ~/Desktop/vault-export.pmvault mysecretpass

use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit, Nonce};
use argon2::Argon2;
use std::{env, fs, process};

const MAGIC: &[u8] = b"PMVAULT1";
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;
const HEADER_LEN: usize = MAGIC.len() + SALT_LEN + NONCE_LEN;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() != 3 {
        eprintln!("Usage: {} <vault-file> <passphrase>", args[0]);
        process::exit(1);
    }

    let vault_path = &args[1];
    let passphrase = &args[2];

    // 1. Read file
    let data = fs::read(vault_path).unwrap_or_else(|e| {
        eprintln!("FAIL read file: {}", e);
        process::exit(1);
    });
    println!("file size      : {} bytes", data.len());

    // 2. Check magic
    if data.len() < HEADER_LEN {
        eprintln!("FAIL file too small ({} bytes, need at least {})", data.len(), HEADER_LEN);
        process::exit(1);
    }
    if &data[..MAGIC.len()] != MAGIC {
        eprintln!("FAIL magic mismatch — got {:?}, want {:?}", &data[..MAGIC.len()], MAGIC);
        process::exit(1);
    }
    println!("magic          : OK");

    // 3. Parse header
    let salt = &data[MAGIC.len()..MAGIC.len() + SALT_LEN];
    let nonce_bytes = &data[MAGIC.len() + SALT_LEN..HEADER_LEN];
    let ciphertext = &data[HEADER_LEN..];
    println!("salt           : {} bytes", salt.len());
    println!("nonce          : {} bytes", nonce_bytes.len());
    println!("ciphertext     : {} bytes", ciphertext.len());

    // 4. Derive key
    let mut key = [0u8; KEY_LEN];
    Argon2::default()
        .hash_password_into(passphrase.as_bytes(), salt, &mut key)
        .unwrap_or_else(|e| {
            eprintln!("FAIL key derivation: {}", e);
            process::exit(1);
        });
    println!("key derivation : OK");

    // 5. Decrypt
    let cipher = Aes256Gcm::new_from_slice(&key).expect("cipher init");
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher.decrypt(nonce, ciphertext).unwrap_or_else(|_| {
        eprintln!("FAIL decryption — wrong passphrase or corrupted file");
        process::exit(1);
    });
    println!("decryption     : OK ({} bytes)", plaintext.len());

    // 6. Verify SQLite magic bytes
    if plaintext.len() >= 16 && &plaintext[..16] == b"SQLite format 3\0" {
        println!("sqlite header  : OK");
    } else {
        eprintln!("FAIL plaintext does not start with SQLite magic");
        process::exit(1);
    }

    println!("\nVault is valid.");
}
