# Terraform HTTP Backend — Go Source Reference

The Terraform CLI's HTTP backend implementation is the authoritative source for understanding which endpoints to implement and the exact request/response contracts. The official documentation covers client-side configuration but not the wire format.

## Primary Source: `client.go`

**[`internal/backend/remote-state/http/client.go`](https://github.com/hashicorp/terraform/blob/main/internal/backend/remote-state/http/client.go)**

This is the most important file. It contains the `Get`, `Put`, `Delete`, `Lock`, and `Unlock` methods that define exactly what HTTP requests the CLI sends and what responses it expects.

Key things to look for in this file:

- **`Get()`** — sends `GET`, checks for `200` (parses JSON body) vs `404`/`204` (empty state). Any other status is an error.
- **`Put()`** — sends `POST` or `PUT` (depending on `update_method`), attaches `?ID=` query param when locking is active, sends `Content-MD5` header.
- **`Delete()`** — sends `DELETE` to the state address.
- **`Lock()`** — sends `POST` (or configured `lock_method`) with `LockInfo` JSON body. On `409`/`423`, parses the response body as `LockInfo` to display the current holder.
- **`Unlock()`** — sends `DELETE` (or configured `unlock_method`) with `LockInfo` JSON body. Note: `force-unlock` sends an empty body (see issue below).

## Supporting Sources

| File | What it tells you |
| ---- | ----------------- |
| [`internal/backend/remote-state/http/backend.go`](https://github.com/hashicorp/terraform/blob/main/internal/backend/remote-state/http/backend.go) | Client configuration schema — all the fields in `backend "http" {}` and their environment variable overrides (`TF_HTTP_*`). |
| [`internal/states/statemgr/locker.go`](https://github.com/hashicorp/terraform/blob/main/internal/states/statemgr/locker.go) | `LockInfo` struct definition — the JSON field names (`ID`, `Operation`, `Info`, `Who`, `Version`, `Created`, `Path`) and their types. |

## Issues and PRs Worth Reading

| Link | Why it matters |
| ---- | -------------- |
| [PR #15793](https://github.com/hashicorp/terraform/pull/15793) | Original addition of locking to the HTTP backend. Includes a reference Python server implementation. |
| [Issue #28421](https://github.com/hashicorp/terraform/issues/28421) | `terraform force-unlock` sends an empty body to the unlock endpoint. If your server rejects empty-body unlocks, `force-unlock` is broken. |
| [Issue #32731](https://github.com/hashicorp/terraform/issues/32731) | When `update_method = "PUT"`, the CLI only accepts `200` as success — not `201` or `204`. |

## Other Reference Implementations

- **GitLab** — [`app/controllers/api/v4/terraform`](https://gitlab.com/gitlab-org/gitlab/-/tree/master/app/controllers/api/v4/terraform) — production-quality, handles all edge cases.
- **OpenTofu** — [`internal/backend/remote-state/http`](https://github.com/opentofu/opentofu/tree/main/internal/backend/remote-state/http) — same protocol as Terraform (forked), useful as a second reading.
