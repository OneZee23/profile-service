FROM node:22.15.0-slim AS base
# Prisma picks its engine binary by the openssl it detects. Installing it here,
# before `prisma generate` runs, keeps the build and the runtime on the same one.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

FROM base AS package
USER node
WORKDIR /workbench
COPY --chown=node:node package.json yarn.lock ./
# --ignore-scripts: postinstall runs `prisma generate`, and prisma/ is not here yet
RUN yarn install --frozen-lockfile --immutable --ignore-scripts

FROM package AS build
COPY --chown=node:node tsconfig.json tsconfig.build.json nest-cli.json ./
COPY --chown=node:node src src
COPY --chown=node:node prisma prisma
RUN yarn prisma:generate
RUN yarn build

FROM package AS deps
RUN yarn install --immutable --offline --production --ignore-scripts
# ts-morph is an optional peer of @nestjs/graphql used only by the build-time
# CLI plugin, and typescript reaches production only through @nestjs/cli.
# Neither is imported once dist/ is built. `effect` and `fast-check` look like
# the same kind of build-time weight but are NOT — they are runtime
# dependencies of @prisma/config, which the entrypoint loads before migrating.
RUN rm -rf node_modules/ts-morph node_modules/@ts-morph node_modules/typescript

FROM base AS app
USER node
WORKDIR /app
COPY --from=deps --chown=node:node /workbench/node_modules node_modules
COPY --from=build --chown=node:node /workbench/node_modules/.prisma node_modules/.prisma
COPY --from=build --chown=node:node /workbench/node_modules/@prisma node_modules/@prisma
COPY --from=build --chown=node:node /workbench/node_modules/prisma node_modules/prisma
COPY --from=build --chown=node:node /workbench/dist dist
COPY --chown=node:node prisma prisma
COPY --chown=node:node assets assets
COPY --chown=node:node static static
COPY --chown=node:node --chmod=755 docker-entrypoint.sh docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
