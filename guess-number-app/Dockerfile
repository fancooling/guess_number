# Stage 1: Build Phase
FROM node:18-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve Phase
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/guess-number-app/browser /usr/share/nginx/html

# Cloud Run defaults port 8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
