FROM node:22-alpine

WORKDIR /app

COPY client/package.json client/package-lock.json ./client/
COPY server/package.json server/package-lock.json ./server/

RUN npm ci --prefix client && npm ci --prefix server

COPY shared ./shared
COPY client ./client
COPY server ./server

RUN npm run build --prefix client

ENV NODE_ENV=production
ENV PORT=4301
EXPOSE 4301

CMD ["npm", "start", "--prefix", "server"]
