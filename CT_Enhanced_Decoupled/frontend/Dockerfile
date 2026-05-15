# ─── Frontend — Static file server ───────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy package files first (layer cache)
COPY package*.json ./

# No npm dependencies needed for static server
# (serve.js uses only Node built-ins)

# Copy all frontend assets
COPY . .

EXPOSE 3000

CMD ["node", "serve.js"]
