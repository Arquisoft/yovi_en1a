# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --silent

COPY . .

ARG VITE_API_URL
ARG VITE_GAMEY_URL
ARG VITE_GAMEY_API_URL

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GAMEY_URL=${VITE_GAMEY_URL}
ENV VITE_GAMEY_API_URL=${VITE_GAMEY_API_URL}

RUN npm run build

# Production image
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]