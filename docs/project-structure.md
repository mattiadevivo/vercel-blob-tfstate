# Project Structure

## Architecture

The project follows a hexagonal (ports and adapters) architecture. Dependencies flow inward: the domain has zero external dependencies, and infrastructure details are injected through port interfaces.

```
HTTP handlers (driving adapter)  -->  StateService (use case)  -->  Domain (entities, errors, ports)
                                                                          ^
Infrastructure adapters (driven) ----------------------------------------/
```

## Source Layout

```
src/
├── index.ts                              Composition root — wires adapters, service, and HTTP server
├── config/
│   └── config.ts                         Zod-validated environment configuration
├── domain/
│   ├── state.ts                          State type (opaque string — no server-side validation)
│   ├── lock-info.ts                      LockInfo Zod schema and type
│   ├── errors.ts                         Domain errors: StateNotFoundError, LockConflictError, LockMismatchError
│   └── ports/
│       ├── state-store.ts                StateStore interface (get / put / delete)
│       └── lock-store.ts                 LockStore interface (get / put / delete)
├── application/
│   └── state-service.ts                  Business logic — lock validation, state CRUD orchestration
├── infrastructure/
│   ├── blob-state-store.ts               StateStore adapter: Vercel Blob (path: tfstate/{name}/state.json)
│   └── redis-lock-store.ts               LockStore adapter: Redis via ioredis (key: tfstate:lock:{name})
└── http/
    ├── index.ts                          Hono app — logger, basic auth middleware, health check, routing
    └── state/
        └── index.ts                      Route handlers for the Terraform HTTP backend protocol
```

## Layers

### Domain (`src/domain/`)

Pure types and interfaces with no external dependencies. Defines what the application *needs* without prescribing *how*.

- **State** is a type alias for `string`. The Terraform protocol requires the server to treat state as an opaque blob — store and return verbatim.
- **LockInfo** includes all protocol fields: `ID`, `Operation`, `Info`, `Who`, `Version`, `Created`, `Path`.
- **Errors** carry domain-relevant data. `LockConflictError` and `LockMismatchError` include the `existingLock` so the HTTP layer can return it in the 409 response body (required by the protocol for the CLI to display lock holder info).
- **Ports** are TypeScript interfaces (`StateStore`, `LockStore`) that infrastructure adapters implement.

### Application (`src/application/`)

Orchestrates business logic through the port interfaces:

| Method         | Behavior                                                                   |
| -------------- | -------------------------------------------------------------------------- |
| `getState`     | Returns state or throws `StateNotFoundError`                               |
| `updateState`  | Validates lock ID matches before writing; throws `LockMismatchError`       |
| `deleteState`  | Idempotent delete                                                          |
| `acquireLock`  | Idempotent re-acquire (same ID returns success); `LockConflictError` otherwise |
| `releaseLock`  | `undefined` lockInfo = force-unlock (unconditional delete); mismatched ID throws `LockMismatchError` |

### Infrastructure (`src/infrastructure/`)

Concrete adapters implementing the domain ports:

- **BlobStateStore** — uses `@vercel/blob` SDK. States stored at `tfstate/{name}/state.json` with private access.
- **RedisLockStore** — uses `ioredis`. Locks stored as JSON at key `tfstate:lock:{name}`. Serialization/deserialization happens here (the service works with typed `LockInfo` objects).

### HTTP (`src/http/`)

Driving adapter. Translates between the Terraform wire protocol and the application layer:

- **Middleware**: `logger()` on all routes, `basicAuth` on `/state/*`.
- **Health check**: `GET /health` (no auth).
- **State routes**: `GET`, `POST`, `PUT`, `DELETE` on `/:name` and `/:name/lock`.
- **Error mapping**: `StateNotFoundError` -> 404, `LockConflictError` / `LockMismatchError` -> 409 with existing `LockInfo` body.

### Composition Root (`src/index.ts`)

The only file that imports concrete infrastructure classes. Wires: `Config` -> adapters -> `StateService` -> `HttpApp`.

## Configuration

Environment variables (validated by Zod at startup):

| Variable               | Required | Default                  |
| ---------------------- | -------- | ------------------------ |
| `BLOB_READ_WRITE_TOKEN`| yes      | —                        |
| `AUTH_PASSWORD`         | yes      | —                        |
| `REDIS_URL`            | no       | `redis://localhost:6379` |
| `HTTP_HOST`            | no       | `0.0.0.0`               |
| `HTTP_PORT`            | no       | `3000`                   |
