# Astro blog - static build served by Caddy
# Build context = src/astroblog (Railway root directory)
FROM node:24-alpine AS build

WORKDIR /app

COPY src/astroblog/package*.json ./

COPY . .
RUN npm run build

FROM caddy:2-alpine

# ...
COPY src/astroblog/Caddyfile /etc/caddy/Caddyfile

COPY --from=build /app/dist /srv/blog

EXPOSE 7777
