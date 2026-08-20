FROM node:22-alpine3.21 AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27.4-alpine

ENV GROWTH_API_UPSTREAM=http://growth-api:8080 \
    NGINX_ENVSUBST_FILTER=GROWTH_API_UPSTREAM

COPY deploy/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -T 2 -O - http://127.0.0.1:8080/healthz | grep -q '^ok$' || exit 1
