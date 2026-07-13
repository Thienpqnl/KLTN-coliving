FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./package.json
COPY services/api-gateway ./services/api-gateway
COPY services/shared ./services/shared
EXPOSE 4000
CMD ["node", "services/api-gateway/server.cjs"]
