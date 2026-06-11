# Astro blog - static build served by Caddy
# Build context = src/astroblog (Railway root directory)
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
# base='/blog' 只影响链接前缀，产物仍在 dist/ 根；
# 放进 /srv/blog 使 URL 路径 /blog/* 与文件路径对齐
COPY --from=build /app/dist /srv/blog

EXPOSE 8080
