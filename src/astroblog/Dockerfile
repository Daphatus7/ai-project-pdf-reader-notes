# Astro blog - static build served by Caddy
# Build context = repo root (same as frontend service); Dockerfile path set in Railway
FROM node:24-alpine AS build

WORKDIR /app

COPY src/astroblog/package*.json ./
RUN npm ci

# 只拷贝博客自身源码，避免根目录 package.json 覆盖上面的依赖声明
COPY src/astroblog/ ./
RUN npm run build

FROM caddy:2-alpine

COPY src/astroblog/Caddyfile /etc/caddy/Caddyfile

# Caddy root 是 /srv，请求路径带 /blog 前缀，故产物放 /srv/blog
COPY --from=build /app/dist /srv/blog

EXPOSE 7777
