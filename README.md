<p align="center">
  <img src="docs/assets/terraform.svg" width="72" alt="Terraform logo" />
  &nbsp;&nbsp;&nbsp;
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/vercel-dark.svg" />
    <img src="docs/assets/vercel-light.svg" width="64" alt="Vercel logo" />
  </picture>
</p>

# vercel-blob-tfstate

A self-hostable [Terraform HTTP backend](https://developer.hashicorp.com/terraform/language/backend/http) that stores state in [Vercel Blob](https://vercel.com/docs/vercel-blob) and handles state locking with Redis.

## Why

Terraform needs a remote backend to share state across machines and to lock it during operations. The usual options (S3 + DynamoDB, Terraform Cloud, GitLab) are either heavier than needed or tie you to a platform. This project is a small HTTP server you can run anywhere: state lives in a Vercel Blob store, locks live in Redis, and Terraform talks to it through the standard `http` backend, no custom provider required.

Works with OpenTofu too.

## How it works

| Method   | Path                    | Purpose                        |
| -------- | ----------------------- | ------------------------------ |
| `GET`    | `/state/{name}`         | Fetch current state            |
| `POST`   | `/state/{name}?ID={id}` | Replace state                  |
| `PUT`    | `/state/{name}?ID={id}` | Replace state                  |
| `DELETE` | `/state/{name}`         | Delete state                   |
| `POST`   | `/state/{name}/lock`    | Acquire lock                   |
| `DELETE` | `/state/{name}/lock`    | Release lock (empty body = force-unlock) |
| `GET`    | `/health`               | Health check (no auth)         |

`{name}` identifies a state file, so one server instance can back any number of projects. Lock acquisition is atomic (Redis `SET NX`), and concurrent runs get a `409` with the current lock holder, which Terraform reports and can force-unlock.

All `/state/*` routes are protected with HTTP basic auth: the username is ignored, the password must match `AUTH_PASSWORD`.

See [`protocol.md`](./protocol.md) for the full wire protocol and [`openapi.yaml`](./openapi.yaml) for the machine-readable spec.

## Configuring Terraform

```hcl
terraform {
  backend "http" {
    address        = "https://your-server.example.com/state/my-project"
    lock_address   = "https://your-server.example.com/state/my-project/lock"
    unlock_address = "https://your-server.example.com/state/my-project/lock"
    lock_method    = "POST"
    unlock_method  = "DELETE"
    username       = "terraform"
  }
}
```

Pass the password via environment variable instead of committing it:

```sh
export TF_HTTP_PASSWORD=your-secret-password
terraform init
```

A complete working example is in [`example/`](./example).

## Configuration

The server is configured entirely through environment variables (a `.env` file is loaded if present, see [`.env.example`](./.env.example)):

| Variable                      | Required | Default                  | Description                                        |
| ----------------------------- | -------- | ------------------------ | -------------------------------------------------- |
| `BLOB_READ_WRITE_TOKEN`       | yes      | -                        | Vercel Blob read-write token                       |
| `AUTH_PASSWORD`               | no       | `''`                     | Basic auth password for `/state/*` (set one!)      |
| `HTTP_HOST`                   | no       | `0.0.0.0`                | Listen address                                     |
| `HTTP_PORT`                   | no       | `3000`                   | Listen port                                        |
| `REDIS_URL`                   | no       | `redis://localhost:6379` | Redis connection URL                               |
| `REDIS_LOCK_ACQUIRE_ATTEMPTS` | no       | `3`                      | Retry attempts for atomic lock acquisition         |

You need a Vercel Blob store: create one in the Vercel dashboard (Storage > Blob) and copy its read-write token.

## Running from source

Requires Node.js 24+, pnpm, and a reachable Redis.

```sh
pnpm install
cp .env.example .env   # then fill in BLOB_READ_WRITE_TOKEN and AUTH_PASSWORD

pnpm dev               # development, with file watching
```

For a production build:

```sh
pnpm build
pnpm start
```

## Running with Docker

### Single container (embedded Redis)

[`docker-compose.yml`](./docker-compose.yml) builds the image with `INSTALL_REDIS=true`, so Redis runs inside the same container. Simplest option, no persistence for locks across restarts:

```sh
docker compose up --build
```

### Separate Redis container

[`docker-compose-with-redis.yml`](./docker-compose-with-redis.yml) runs the server, a Redis with a persistent volume, and [RedisInsight](https://redis.io/insight/) on port 5540 for inspecting locks:

```sh
docker compose -f docker-compose-with-redis.yml up --build
```

### Plain `docker run`

```sh
docker build -t vercel-blob-tfstate .
docker run -p 8090:8090 \
  -e HTTP_PORT=8090 \
  -e BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx \
  -e AUTH_PASSWORD=your-secret-password \
  -e REDIS_URL=redis://your-redis:6379 \
  vercel-blob-tfstate
```

## Development

```sh
pnpm test          # unit tests (vitest)
pnpm lint          # oxlint
pnpm format        # oxfmt
```

The codebase follows a ports-and-adapters layout: domain types and store interfaces in `src/domain`, use-case logic in `src/application`, the Vercel Blob and Redis adapters in `src/infrastructure`, and the Hono HTTP layer in `src/http`. See [`docs/project-structure.md`](./docs/project-structure.md).

## Caveats

- Locks have no TTL: if a Terraform run dies without unlocking, run `terraform force-unlock <lock-id>` (this matches the behavior of most backends).
- State is stored unencrypted in your Blob store and may contain secrets; treat the store and this server's password accordingly.
