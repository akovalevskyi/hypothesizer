# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Ensure /app/data is created for mounted config keys
RUN mkdir -p /app/data

ENV HOST=0.0.0.0
ENV PORT=4325
EXPOSE 4325

CMD ["node", "./dist/server/entry.mjs"]