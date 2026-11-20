FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-liberation ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_SKIP_DOWNLOAD=1 CHROME_PATH=/usr/bin/chromium SESSION_DIR=/data/session
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
VOLUME /data
CMD ["node", "src/index.js"]
