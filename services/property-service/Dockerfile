FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./package.json
COPY prisma ./prisma
COPY services/property-service ./services/property-service
COPY services/shared ./services/shared
RUN ./node_modules/.bin/prisma generate
EXPOSE 4002
CMD ["node", "services/property-service/server.cjs"]
