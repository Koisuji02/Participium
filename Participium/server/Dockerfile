FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# Install all dependencies (including dev) and build
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./

RUN npm install --only=production --no-audit --no-fund && \
    # Ensure tsconfig-paths is available at runtime (guard against lockfile mismatches)
    npm install tsconfig-paths --no-audit --no-fund --no-save

# Copy built app and uploads if present
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/uploads ./uploads
COPY --from=builder /usr/src/app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh || true
COPY --from=builder /usr/src/app/tsconfig.runtime.json ./tsconfig.json

RUN chmod +x ./docker-entrypoint.sh || true
EXPOSE 5000

COPY --from=builder /usr/src/app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh || true

EXPOSE 5000

# Run entrypoint script directly so it can prepare environment and then exec CMD
ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]
CMD ["node","-r","tsconfig-paths/register","/usr/src/app/dist/src/index.js"]
