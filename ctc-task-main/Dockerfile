# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend and run
FROM node:22-alpine
WORKDIR /app

# Install build tools for sqlite3 native module (fixes GLIBC errors)
RUN apk add --no-cache python3 make g++ 

# Setup backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy built frontend from Stage 1 to the location expected by backend
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
# Important: Map the database inside the container to a volume path
ENV DB_PATH=/app/data/database.sqlite

# Create volume directories
RUN mkdir -p /app/data /app/uploads && chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 3000

CMD ["npm", "start"]
