#!/bin/sh
set -eu

node -e "
require('reflect-metadata');
const { writeFileSync } = require('node:fs');
const { getConfig } = require('/app/dist/utils/config');
const { DatabaseConfig } = require('/app/dist/infra/database/database.config');
getConfig(DatabaseConfig).then((config) => writeFileSync('/tmp/database-url', config.url()));
"

DATABASE_URL="$(cat /tmp/database-url)"
export DATABASE_URL
rm /tmp/database-url

node node_modules/prisma/build/index.js migrate deploy

exec "$@"
