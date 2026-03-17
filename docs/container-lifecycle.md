# Container Lifecycle

## Provisioning Flow

1. Authenticated user submits a create request.
2. Backend validates tenant policy and resource limits.
3. Service calls the Proxmox module.
4. Proxmox creates an unprivileged LXC container.
5. Container record and ownership records are persisted.
6. Audit log captures the request and result.

## Runtime Actions

- start
- stop
- restart
- snapshot
- delete

Each action should follow the same pattern:

1. authenticate
2. authorize
3. validate container state transition
4. call Proxmox integration layer
5. persist result
6. emit audit log

## Command Execution Flow

1. User submits a tokenized command.
2. Backend validates command safety and ownership.
3. API enqueues a command job.
4. Worker executes the command through Proxmox `pct exec`.
5. Stdout/stderr are streamed via WebSocket.
6. Final status is stored in command execution logs.

## Terminal Flow

1. User opens a terminal session in the dashboard.
2. Frontend connects to the terminal WebSocket endpoint.
3. Backend opens an isolated session bridge for the target container.
4. Terminal resize and input events are relayed bidirectionally.
5. Session closure is logged and cleaned up.