# frontendのビルドとbackendのコンパイルを行い、実行に必要なものだけを最終段へ残す。
FROM node:22-alpine AS build

WORKDIR /app

# lockfileを正としてインストールするため、manifestだけ先に置いて層を再利用する。
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci

COPY . .
RUN npm run build --workspaces --if-present

# 実行時はdevDependenciesを持たない。
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/frontend/dist frontend/dist

# 同じオリジンからSPAを配信する。別オリジンにするとCookieを緩める必要がある。
ENV FRONTEND_DIST_PATH=/app/frontend/dist
EXPOSE 3000

CMD ["node", "backend/dist/server.js"]
