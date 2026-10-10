# Build context is the repo root (needs packages/shared):
#   docker build -f apps/server/Dockerfile .
FROM node:24-alpine
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
RUN npm ci --omit=dev --workspace @calories/server --include-workspace-root=false
COPY packages/shared/src packages/shared/src
COPY apps/server/src apps/server/src
WORKDIR /repo/apps/server
ENV PORT=8787
EXPOSE 8787
CMD ["node", "src/index.ts"]
