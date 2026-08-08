FROM node:26-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./


# ---- dev stage ----
FROM base AS dev

RUN npm install

COPY . .

CMD ["npx", "nodemon", "src/index.js"]

# ---- production stage ----
FROM base AS production

RUN npm install --omit=dev

COPY . .

CMD ["node", "src/index.js"]