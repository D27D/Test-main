# syntax=docker/dockerfile:1
ARG NODE_VERSION=22

# ---------- etapa de compilación ----------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---------- imagen final ----------
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY public ./public

ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}

# usuario sin privilegios "node" incluido en la imagen oficial
USER 1000:1000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1:3000/health"]
CMD ["node", "dist/server.js"]
