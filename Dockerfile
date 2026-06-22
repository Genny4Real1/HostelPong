FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production && npm cache clean --force

COPY . .

EXPOSE 3000

ENV NODE_ENV=production

USER node

CMD ["node", "server/server.js"]
