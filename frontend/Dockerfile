# 프론트 운영 이미지 (B10) — 일반 빌드(실서버 API 사용, 데모 아님)를 Caddy 가 서빙
#   docker build -t sijak-web frontend
# 설정(HTTPS·/api 프록시·캐시)은 infra/Caddyfile 을 compose 가 넣어 준다.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV VITE_BASE=/
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
