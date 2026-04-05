//! Provider registry that maps provider names to their [`GitProvider`] implementations.

use std::{collections::HashMap, sync::Arc};

use crate::webhooks::{
    forgejo::ForgejoProvider, github::GitHubProvider, provider::GitProvider,
};

/// A registry mapping provider names (e.g. `"github"`) to their implementations.
pub struct ProviderRegistry {
    providers: HashMap<&'static str, Arc<dyn GitProvider>>,
}

impl ProviderRegistry {
    /// Creates a new registry pre-populated with all known providers.
    pub fn new() -> Self {
        let mut providers: HashMap<&'static str, Arc<dyn GitProvider>> = HashMap::new();
        providers.insert("github", Arc::new(GitHubProvider));
        providers.insert("forgejo", Arc::new(ForgejoProvider));
        Self { providers }
    }

    /// Returns the provider for the given name, or `None` if unknown.
    pub fn get(&self, name: &str) -> Option<&Arc<dyn GitProvider>> {
        self.providers.get(name)
    }
}

impl Default for ProviderRegistry {
    fn default() -> Self {
        Self::new()
    }
}
