# Profile microservice

## Description

Microservice for presenting a single engineering profile — skills, experience and
projects — over a public GraphQL API.

## Usage

### Requirements

- Node v.22 or higher
- Docker with Compose v2

### Installation

```shell
yarn install
```

### Build

```shell
yarn build
```

### Startup

```shell
yarn config:build   # renders config/*.example.yaml into config.json
yarn infra          # postgres on :5435, then applies migrations
yarn start:dev
```

Configuration is a single `config.json`, keyed by configuration class name, built
from `config/config.<env>.yaml` (deployment settings) and
`config/resume.<env>.yaml` (the résumé content). Rebuild it with
`yarn config:build` after editing either.

The local Postgres listens on 5435, not 5432.

### GraphQL

```text
http://localhost:3000/graphql
```

Apollo Sandbox is served on the API path itself. The schema is code-first and
`src/schema.gql` is generated on boot, so do not edit it by hand — CI fails on
drift.

There is no authentication and no REST surface beyond `GET /health/check`.

## Testing

```shell
yarn test        # unit
yarn typecheck   # ts-jest skips type checking, this covers test/
yarn infra       # e2e needs a real database
yarn test:e2e
yarn test:l10n
```

## Migrations

```shell
yarn migrate:dev      # create and apply, after editing prisma/schema.prisma
yarn migrate:deploy   # apply only
```

Both take `DATABASE_URL` from the `DatabaseConfig` section of `config.json`.
In deployed environments `docker-entrypoint.sh` runs `migrate deploy` before the
process starts.

Content is not migrated. `ProfileSeedService` reconciles the database against
`ResumeConfig` on every boot: it upserts each record by a content-derived id,
deletes what is no longer in the config, and skips the pass when a checksum
shows the content is unchanged.

## CI

### Workflow

Continuous integration works for the `master` branch only.

Trigger deployment for production:

```shell
git push origin master   # then approve the `prod` environment in GitHub Actions
```

### Configuration

Non-secret production values live in `config/config.prod.yaml` and
`config/resume.prod.yaml`, both committed. Secrets come from the
`CONFIG_SECRETS_JSON` repository secret, deep-merged over them at deploy time.

Deployment is `docker compose` on a single VPS behind a Cloudflare Tunnel.
