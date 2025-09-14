# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 4001

CMD ["node", "src/server.js"]

