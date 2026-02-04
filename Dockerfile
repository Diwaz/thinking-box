FROM oven/bun:latest

WORKDIR /app

COPY package.* bun.lock ./

RUN bun install --production

COPY . .

CMD ["bun","run", "index.ts"]