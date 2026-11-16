# API do Pet System. Build a partir da RAIZ do monorepo:
#   docker build -f apps/api/Dockerfile -t petsystem-api .
FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api
# O Prisma 7 lê DATABASE_URL até para gerar o cliente; no build vale um endereço qualquer.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm install --frozen-lockfile --filter @petsystem/api... \
 && pnpm --filter @petsystem/contracts build \
 && pnpm --filter @petsystem/api generate \
 && pnpm --filter @petsystem/api build \
 && pnpm --filter @petsystem/api deploy --prod --legacy /out

FROM node:24-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3340
WORKDIR /app
COPY --from=build /out ./
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/src/generated ./src/generated
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/apps/api/prisma.config.ts ./
USER node
EXPOSE 3340
# Migrações: docker run --rm --env-file .env petsystem-api node_modules/.bin/prisma migrate deploy
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3340/health || exit 1
CMD ["node", "dist/main.js"]
