FROM node:20-alpine

WORKDIR /app

# Install dependencies (including dev deps needed for the build)
COPY package*.json ./
RUN npm install

# Build the React app
COPY . .
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "server.mjs"]
