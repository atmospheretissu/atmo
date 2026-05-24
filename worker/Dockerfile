# Playwright base image — ships Chromium + system deps, no apt-get gymnastics
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev=false

COPY tsconfig.json ./
COPY src ./src

RUN npx tsc

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
