FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY . .
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" npm run db:generate
RUN npm run build -w @hirehub/shared && npm run build -w @hirehub/api
CMD ["sh","-c","npm run db:deploy && npm run start -w @hirehub/api"]

