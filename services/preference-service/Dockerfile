FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
RUN npx prisma generate

COPY services ./services

EXPOSE 4005

CMD ["node", "services/preference-service/server.cjs"]
