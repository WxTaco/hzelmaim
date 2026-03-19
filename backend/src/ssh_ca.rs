//! SSH Certificate Authority for signing ephemeral user certificates.
//!
//! The backend holds a CA private key (ed25519) on disk. When a terminal
//! session is requested, an ephemeral keypair is generated in memory, the
//! public half is signed by the CA with a short validity window, and the
//! resulting certificate + ephemeral private key are used to SSH to the
//! container. Nothing is persisted — keys are discarded after the session.

use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use ssh_key::{
    certificate::{self, CertType},
    rand_core::OsRng,
    Algorithm, Certificate, PrivateKey,
};

use crate::utils::error::ApiError;

/// Signed ephemeral credential used for a single SSH session.
pub struct EphemeralCert {
    /// The ephemeral private key (never stored).
    pub private_key: PrivateKey,
    /// The signed certificate for the ephemeral public key.
    pub certificate: Certificate,
}

/// SSH Certificate Authority backed by an ed25519 key on disk.
pub struct SshCa {
    ca_key: PrivateKey,
}

impl SshCa {
    /// Loads the CA private key from the given path.
    ///
    /// The file must be an unencrypted OpenSSH private key (ed25519 recommended).
    pub fn load(path: impl AsRef<Path>) -> Result<Self, ApiError> {
        let key_data = std::fs::read_to_string(path.as_ref()).map_err(|e| {
            ApiError::internal(format!(
                "Failed to read SSH CA key at {}: {e}",
                path.as_ref().display()
            ))
        })?;
        let ca_key = PrivateKey::from_openssh(&key_data)
            .map_err(|e| ApiError::internal(format!("Failed to parse SSH CA key: {e}")))?;
        Ok(Self { ca_key })
    }

    /// Returns the CA public key in OpenSSH authorized_keys format.
    ///
    /// This is the value that goes into `TrustedUserCAKeys` on each container.
    pub fn public_key_openssh(&self) -> String {
        self.ca_key.public_key().to_openssh().unwrap_or_default()
    }

    /// Issues a short-lived SSH certificate for a new ephemeral keypair.
    ///
    /// - `principal`: the Unix username the certificate is valid for (e.g. "root")
    /// - `key_id`: an identifier for audit (e.g. "user:<uuid>:session:<uuid>")
    /// - `validity_secs`: how long the certificate is valid (default: 60s)
    pub fn issue(
        &self,
        principal: &str,
        key_id: &str,
        validity_secs: u64,
    ) -> Result<EphemeralCert, ApiError> {
        // Generate a one-time-use keypair in memory.
        let ephemeral_key = PrivateKey::random(&mut OsRng, Algorithm::Ed25519)
            .map_err(|e| ApiError::internal(format!("Failed to generate ephemeral key: {e}")))?;

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| ApiError::internal(format!("System time error: {e}")))?
            .as_secs();

        let valid_after = now.saturating_sub(10); // 10s clock skew tolerance
        let valid_before = now + validity_secs;

        let mut builder = certificate::Builder::new_with_random_nonce(
            &mut OsRng,
            ephemeral_key.public_key().key_data().clone(),
            valid_after,
            valid_before,
        )
        .map_err(|e| ApiError::internal(format!("Failed to create cert builder: {e}")))?;

        builder
            .cert_type(CertType::User)
            .map_err(|e| ApiError::internal(format!("Failed to set cert type: {e}")))?;
        builder
            .key_id(key_id)
            .map_err(|e| ApiError::internal(format!("Failed to set key id: {e}")))?;
        builder
            .valid_principal(principal)
            .map_err(|e| ApiError::internal(format!("Failed to set principal: {e}")))?;

        // Standard extensions for interactive sessions.
        builder
            .extension("permit-pty", "")
            .map_err(|e| ApiError::internal(format!("Failed to set extension: {e}")))?;
        builder
            .extension("permit-user-rc", "")
            .map_err(|e| ApiError::internal(format!("Failed to set extension: {e}")))?;

        let certificate = builder
            .sign(&self.ca_key)
            .map_err(|e| ApiError::internal(format!("Failed to sign certificate: {e}")))?;

        Ok(EphemeralCert {
            private_key: ephemeral_key,
            certificate,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn issue_ephemeral_cert() {
        // Generate a CA key in memory for testing.
        let ca_key = PrivateKey::random(&mut OsRng, Algorithm::Ed25519).unwrap();
        let ca = SshCa { ca_key };

        let cert = ca.issue("root", "test-session", 60).unwrap();

        // The certificate should be valid for the "root" principal.
        assert_eq!(cert.certificate.cert_type(), CertType::User);
        assert!(cert
            .certificate
            .valid_principals()
            .contains(&"root".to_string()));

        // The ephemeral private key should be ed25519.
        assert_eq!(cert.private_key.algorithm(), Algorithm::Ed25519);
    }
}
