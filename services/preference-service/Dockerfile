FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY services ./services
RUN ./node_modules/.bin/prisma generate --schema services/preference-service/prisma/schema.prisma

EXPOSE 4005

CMD ["node", "services/preference-service/server.cjs"]
