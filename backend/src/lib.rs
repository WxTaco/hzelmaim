//! Backend library entry point for the private infrastructure management platform.

pub mod api;
pub mod app_state;
pub mod auth;
pub mod config;
pub mod db;
pub mod jobs;
pub mod models;
pub mod proxmox;
pub mod services;
pub mod ssh_ca;
pub mod utils;
pub mod webhooks;
