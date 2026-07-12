FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY services ./services
COPY lib ./lib
RUN ./node_modules/.bin/prisma generate --schema services/rental-service/prisma/schema.prisma
EXPOSE 4003
CMD ["node", "services/rental-service/server.cjs"]
