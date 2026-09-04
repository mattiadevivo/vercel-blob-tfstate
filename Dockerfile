FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY src ./src
RUN pnpm build

FROM node:24-bookworm-slim
WORKDIR /app

ARG INSTALL_REDIS=false

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist

RUN if [ "$INSTALL_REDIS" = "true" ]; then \
    apt-get update && apt-get install -y --no-install-recommends ca-certificates lsb-release curl gpg && \
    curl -fsSL https://packages.redis.io/gpg | gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg && \
    chmod 644 /usr/share/keyrings/redis-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/redis.list && \
    apt-get update && apt-get install -y --no-install-recommends redis-server && \
    rm -rf /var/lib/apt/lists/*; \
    fi

ENV INSTALL_REDIS=$INSTALL_REDIS

EXPOSE 8090
CMD ["sh", "-c", "if [ \"$INSTALL_REDIS\" = \"true\" ]; then redis-server --daemonize yes; fi && node dist/index.js"]
