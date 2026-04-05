//! HMAC-SHA256 signature verification for inbound webhook payloads.

use hmac::{Hmac, KeyInit, Mac};
use sha2::Sha256;

use crate::utils::error::ApiError;

type HmacSha256 = Hmac<Sha256>;

/// Decodes a lowercase hex string into bytes without pulling in an extra crate.
fn decode_hex(s: &str) -> Result<Vec<u8>, ()> {
    if s.len() % 2 != 0 {
        return Err(());
    }
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16).map_err(|_| ()))
        .collect()
}

/// Verifies an HMAC-SHA256 signature over `body` using `secret`.
///
/// `signature_hex` must be in the form `sha256=<hex>` (GitHub's format).
/// Uses constant-time comparison to prevent timing oracle attacks.
///
/// # Errors
/// Returns [`ApiError::webhook_signature_invalid`] if the signature is missing,
/// malformed, or does not match.
pub fn verify_hmac_sha256(
    secret: &[u8],
    body: &[u8],
    signature_hex: &str,
) -> Result<(), ApiError> {
    let hex_tag = signature_hex
        .strip_prefix("sha256=")
        .ok_or_else(ApiError::webhook_signature_invalid)?;

    let expected = decode_hex(hex_tag).map_err(|_| ApiError::webhook_signature_invalid())?;

    let mut mac =
        HmacSha256::new_from_slice(secret).map_err(|_| ApiError::webhook_signature_invalid())?;
    mac.update(body);

    mac.verify_slice(&expected)
        .map_err(|_| ApiError::webhook_signature_invalid())
}
