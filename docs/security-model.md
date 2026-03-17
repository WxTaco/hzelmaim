# Security Model

## Core Principles

1. Never trust user input.
2. Never expose raw Proxmox access.
3. Enforce ownership and permissions on every route.
4. Log every security-sensitive action.

## Container Security

- Only unprivileged LXC containers are supported.
- No host filesystem mounts.
- No host device passthrough.
- Strict CPU and memory limits are required on creation.
- Network isolation must be defined per tenant/container.

## Backend Security

- API handlers require authenticated user context.
- Authorization is performed in services before any action.
- Commands are tokenized and validated before queuing.
- Shell interpolation must never be used for container execution.
- Session design assumes secure cookies, expiry, and CSRF protection.
- OIDC support is designed into the auth module.

## File Access Security

Future file-editing APIs must:

- normalize paths before access
- reject path traversal (`..`)
- reject symlink escapes outside the allowed root
- scope all file operations to the container root or approved virtual root

## Audit and Observability

- Authentication events must be logged.
- Container lifecycle actions must be logged.
- Command execution requests and outcomes must be logged.
- Logs should include timestamp, actor, target container, action, and outcome.
