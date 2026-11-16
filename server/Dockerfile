FROM node:20-alpine

# Chromium robi zrzuty stron na miniatury „Przydatnych linków”; fonty Noto
# pokrywają polskie znaki i emoji na zrzucanych stronach.
RUN apk add --no-cache chromium font-noto font-noto-emoji

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data
ENV SCREENSHOT_BROWSER=/usr/bin/chromium-browser

EXPOSE 3001
CMD ["node", "server/index.mjs"]
