# Multi-stage Dockerfile for React/Vite frontend
# Stage 1: Base - Install dependencies (shared between dev and prod)
FROM node:24 AS base

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Stage 2: Development - Hot reload with Vite dev server
FROM base AS development

# Copy all source files (context is root, so this copies everything)
COPY . .

# Expose Vite dev server port
EXPOSE 3000

# Start Vite dev server with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 3: Production - Build optimized static files and serve with simple HTTP server
FROM base AS production

# Copy all source files
COPY . .

# Build production bundle (ARGs are available as env vars during RUN)
RUN npm run build

# Use Node.js to serve static files (simpler than nginx for MVP)
FROM node:24

WORKDIR /app

# Install simple HTTP server
RUN npm install -g serve

# Copy built files from production stage
COPY --from=production /app/build ./build

EXPOSE ${PORT:-3000}

# Serve static files - Railway injects $PORT, local defaults to 3000
CMD ["sh", "-c", "serve -s build -l ${PORT:-3000}"]

