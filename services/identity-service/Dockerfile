FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./package.json
COPY services/identity-service ./services/identity-service
COPY services/shared ./services/shared
RUN ./node_modules/.bin/prisma generate --schema services/identity-service/prisma/schema.prisma
EXPOSE 4001
CMD ["node", "services/identity-service/server.cjs"]
