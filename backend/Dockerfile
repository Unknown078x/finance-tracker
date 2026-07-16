FROM node:20-alpine
WORKDIR /app

# Install deps first for better layer caching
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src ./src

RUN mkdir -p /app/data
ENV NODE_ENV=production
ENV DB_PATH=/app/data/finance.db
ENV PORT=4000

EXPOSE 4000
CMD ["node", "src/server.js"]
