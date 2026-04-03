# Stage 1: Build Angular + NestJS
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
ARG GOOGLE_CLIENT_ID
ENV GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
RUN npm run build -- --configuration production
RUN npm run build:server

# Stage 2: Production runtime
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist/guess-number-app/browser ./server/public
COPY --from=build /app/dist/server ./server
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

EXPOSE 3000
CMD ["node", "server/server/main.js"]
