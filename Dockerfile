# --- builder stage ---
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages ./packages

# Install all dependencies (including dev dependencies for building)
RUN npm ci --prefer-offline

# Build the memory package first (dependency of mcp)
RUN npm run build -w @prompted-forge/memory

# Build the mcp package
RUN npm run build -w @prompted-forge/mcp

# --- runtime stage ---
FROM node:20-alpine AS runtime

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set production environment
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages ./packages

# Install only production dependencies
RUN npm ci --omit=dev --prefer-offline && npm cache clean --force

# Copy built JavaScript from builder stage
COPY --from=builder /app/packages/memory/dist ./packages/memory/dist
COPY --from=builder /app/packages/mcp/dist ./packages/mcp/dist

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=20s --timeout=2s --retries=3 \
  CMD wget -q --no-cache --spider http://localhost:3001/healthz || exit 1

# Start the server
CMD ["node", "packages/mcp/dist/server.js"]
