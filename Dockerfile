# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 运行阶段：仅提供静态文件
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist

VOLUME ["/app/dist"]
