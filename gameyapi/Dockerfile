FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --silent

COPY . .
EXPOSE 3001
CMD ["node", "gamey-service.js"]
