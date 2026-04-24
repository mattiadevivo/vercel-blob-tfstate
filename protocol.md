# Terraform HTTP Backend — Protocol Reference

This document describes the HTTP contract the Terraform CLI (and OpenTofu)
expects when configured with `backend "http"`. The machine-readable spec
lives in [`openapi.yaml`](./openapi.yaml); this page is the narrative version.

The official HashiCorp page ([developer.hashicorp.com/terraform/language/backend/http](https://developer.hashicorp.com/terraform/language/backend/http))
documents the client-side configuration options but not the wire format. The
schema below is reconstructed from the Terraform source.

## Client configuration (recap)

```hcl
terraform {
  backend "http" {
    address        = "https://state.example.com/state/prod"
    lock_address   = "https://state.example.com/state/prod/lock"
    unlock_address = "https://state.example.com/state/prod/lock"
    lock_method    = "POST"     # default is "LOCK"
    unlock_method  = "DELETE"   # default is "UNLOCK"
    update_method  = "POST"     # default; "PUT" is also common
  }
}
```

## Endpoints

| Method   | Path                    | Purpose                                  |
| -------- | ----------------------- | ---------------------------------------- |
| `GET`    | `/state/{name}`         | Fetch current state                      |
| `POST`   | `/state/{name}?ID={id}` | Replace state (default `update_method`)  |
| `PUT`    | `/state/{name}?ID={id}` | Replace state (when `update_method=PUT`) |
| `DELETE` | `/state/{name}`         | Delete state (workspace delete)          |
| `POST`   | `/state/{name}/lock`    | Acquire lock                             |
| `DELETE` | `/state/{name}/lock`    | Release lock                             |

Lock and state URLs can point at the same resource — the HTTP method
disambiguates. Use whatever shape fits your server; the table above is a
common convention (and matches GitLab's implementation).

## Schemas

### `TerraformState`

Raw state JSON. Treat it as an opaque blob — do not validate or rewrite it.
The CLI sends the full state on every update, not a diff. Top-level fields
as of state format v4 include `version`, `terraform_version`, `serial`,
`lineage`, `outputs`, `resources`, `check_results`.

### `LockInfo`

Sent as the request body on `LOCK` and `UNLOCK`, and returned as the response
body on a lock conflict. Field names are **PascalCase** (Go default JSON
marshaling) — do not lowercase them.

```json
{
    "ID": "2f3b1c4e-6e8f-4b8c-9d2f-1a2b3c4d5e6f",
    "Operation": "OperationTypeApply",
    "Info": "",
    "Who": "alice@workstation",
    "Version": "1.9.2",
    "Created": "2026-04-20T10:00:00.123456789Z",
    "Path": ""
}
```

| Field       | Type      | Notes                                                          |
| ----------- | --------- | -------------------------------------------------------------- |
| `ID`        | UUID      | Client-generated. The server keys the lock by this.            |
| `Operation` | string    | `OperationTypePlan`, `OperationTypeApply`, etc. Informational. |
| `Info`      | string    | Free-form. Usually empty.                                      |
| `Who`       | string    | `user@hostname`.                                               |
| `Version`   | string    | Terraform version of the client.                               |
| `Created`   | timestamp | RFC3339Nano, UTC.                                              |
| `Path`      | string    | Local-backend-only. Store and return verbatim.                 |

## Operation details

### `GET /state/{name}` — fetch

- `200` + JSON body → current state.
- `204` or `404` → no state yet. The CLI starts empty.
- Do **not** return `200` with an empty body — it fails JSON parsing.

### `POST|PUT /state/{name}?ID={lock_id}` — update

- Request body is the full state JSON.
- The CLI sends a `Content-MD5` header (base64 of the raw MD5 digest).
  Verification is optional.
- When locking is enabled, the `ID` query parameter holds the lock ID from
  the preceding `LOCK`. **Reject the write if it does not match the held lock.**
- `200` or `204` → success.
- `5xx` → retried by the CLI up to `retry_max` times (default 2), with
  backoff between `retry_wait_min` and `retry_wait_max` seconds.
- `4xx` → surfaced to the user as the error message. Use `409` for lock
  mismatch.

> ⚠️ When `update_method = "PUT"`, return `200` — **not** `201` or `204`.
> The CLI's HTTP backend checks for a narrow set of success codes and
> misinterprets others (Terraform [issue #32731](https://github.com/hashicorp/terraform/issues/32731)).

### `DELETE /state/{name}` — delete

- Called by `terraform workspace delete`. Optional.
- Return `200`/`204` on success, `404` if nothing to delete, or `405` if
  unimplemented — normal `apply`/`plan` flows will still work.

### `POST /state/{name}/lock` — acquire lock

- Request body is the `LockInfo` of the client attempting to acquire.
- `200` → lock acquired. Persist the `LockInfo` keyed by state name.
- `409` or `423` → already locked. **The response body must be the
  `LockInfo` of the current holder, as JSON.** The CLI parses it and shows
  the "Lock Info:" block to the user. A plain-text error here produces the
  confusing `failed to unmarshal body` message.
- Any other status → generic error shown to the user.

### `DELETE /state/{name}/lock` — release lock

Must accept **two call patterns**:

1. **Normal unlock** — the CLI sends the full `LockInfo` in the body.
   Compare `ID` to the held lock and refuse on mismatch (`409`).
2. **`terraform force-unlock <LOCK_ID>`** — the CLI sends an **empty
   body**; the `LOCK_ID` is **not** forwarded to the server. Treat an
   empty-body unlock as "force-release whatever lock is currently held on
   this state." This is a long-standing quirk
   ([issue #28421](https://github.com/hashicorp/terraform/issues/28421));
   if you return `423` here, `force-unlock` will be broken.

Return `200` or `204` on success.

## Authentication

- **Basic Auth** — the CLI sends `Authorization: Basic ...` when `username`
  and `password` (or `TF_HTTP_USERNAME` / `TF_HTTP_PASSWORD`) are set.
- **mTLS** — supported via `client_certificate_pem` / `client_private_key_pem`.
- **Bearer tokens** — not natively supported. Convention is to accept the
  token as the Basic password (as GitLab does with Personal Access Tokens).

## Implementation checklist

- [ ] `GET` returns `200`+JSON for existing state, `204`/`404` for missing.
- [ ] `POST`/`PUT` writes the full body; reject when `?ID=` does not match
      the held lock.
- [ ] Return `200` (not `201`/`204`) on successful `PUT` writes.
- [ ] `LOCK` returns `200` on success, `409`/`423` with `LockInfo` JSON body
      on conflict.
- [ ] `UNLOCK` with a body verifies the `ID` against the held lock.
- [ ] `UNLOCK` with an empty body force-releases the held lock.
- [ ] `5xx` for transient failures (triggers client retry), `4xx` otherwise.
- [ ] Store state versions server-side (S3 versioning, git, append-only
      rows) even though the protocol doesn't require it — disaster recovery
      is what saves you the one time it matters.

## Sources

All protocol details above are derived from these references:

| Source                                                                                                                                            | What it authoritative for                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`internal/backend/remote-state/http/client.go`](https://github.com/hashicorp/terraform/blob/main/internal/backend/remote-state/http/client.go)   | The wire protocol. `Get`/`Put`/`Delete`/`Lock`/`Unlock` methods.  |
| [`internal/backend/remote-state/http/backend.go`](https://github.com/hashicorp/terraform/blob/main/internal/backend/remote-state/http/backend.go) | Config schema and environment-variable mapping.                   |
| [`internal/states/statemgr/locker.go`](https://github.com/hashicorp/terraform/blob/main/internal/states/statemgr/locker.go)                       | `LockInfo` Go struct — the JSON field names and types.            |
| [PR #15793](https://github.com/hashicorp/terraform/pull/15793)                                                                                    | Original addition of locking; contains a reference Python server. |
| [Issue #28421](https://github.com/hashicorp/terraform/issues/28421)                                                                               | `force-unlock` empty-body behavior.                               |
| [Issue #32731](https://github.com/hashicorp/terraform/issues/32731)                                                                               | `lock_method="PUT"` response code handling.                       |
| [Backend docs](https://developer.hashicorp.com/terraform/language/backend/http)                                                                   | Client-side config options (no wire schema).                      |
| [GitLab state backend](https://gitlab.com/gitlab-org/gitlab/-/tree/master/app/controllers/api/v4/terraform)                                       | Production-quality reference server implementation.               |
| [OpenTofu http backend](https://github.com/opentofu/opentofu/tree/main/internal/backend/remote-state/http)                                        | Same protocol, OpenTofu fork — useful second reading.             |
