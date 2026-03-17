# API Specification

## Authentication

- `POST /api/v1/auth/login`
  - reserved for OIDC/session bootstrap
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`

## Containers

- `GET /api/v1/containers`
- `POST /api/v1/containers`
- `GET /api/v1/containers/:container_id`
- `POST /api/v1/containers/:container_id/start`
- `POST /api/v1/containers/:container_id/stop`
- `POST /api/v1/containers/:container_id/restart`
- `GET /api/v1/containers/:container_id/metrics`

## Commands

- `POST /api/v1/containers/:container_id/commands`
- `GET /api/v1/commands/:job_id`
- `GET /ws/jobs/:job_id`

## Terminal

- `GET /ws/terminal/:container_id`

## Audit

- `GET /api/v1/audit-logs`

## Error Shape

```json
{
  "error": {
    "code": "CONTAINER_NOT_FOUND",
    "message": "The requested container does not exist"
  }
}
```

## Success Shape

```json
{
  "data": {}
}
```
