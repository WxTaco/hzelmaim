# Architecture

## Overview

The platform is split into two top-level applications:

- `frontend/`: React + TypeScript + Tailwind UI
- `backend/`: Rust API and orchestration layer

All user requests flow through the backend. Users never receive raw Proxmox credentials or direct Proxmox API access.

## Backend Layers

- `api/`: HTTP and WebSocket handlers, request/response contracts
- `auth/`: session, OIDC-ready auth context, authorization helpers
- `services/`: orchestration and policy enforcement
- `models/`: typed data structures shared across layers
- `proxmox/`: the only module allowed to talk to Proxmox VE
- `jobs/`: command queue and terminal stream contracts
- `utils/`: errors and structured logging

## Frontend Layers

- `components/`: reusable UI building blocks
- `pages/`: route-level screens
- `types/`: explicit API contracts

## Component Flow

1. Frontend sends a typed request to the backend.
2. API handler authenticates the actor and validates input.
3. Service layer enforces ownership and platform policy.
4. Proxmox module performs the underlying container action.
5. Jobs and audit logs capture activity and output.
6. WebSockets stream command and terminal events back to the UI.

## Scalability Direction

- Add database-backed repositories behind services.
- Replace in-memory job queue with Redis, NATS, or Postgres-backed jobs.
- Introduce worker processes for command execution.
- Partition Proxmox hosts behind a scheduler layer.
- Add metrics export and centralized structured logging.
