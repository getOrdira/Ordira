// Dockerfile (place at project root, no file extension)

Use official Node.js LTS Alpine image

FROM node:18-alpine

Set working directory

WORKDIR /app

Install production dependencies

COPY package.json package-lock.json ./
RUN npm ci --only=production

Copy source code

COPY . .

(Optional) Build TypeScript if you use it

RUN npm run build

Expose application port

EXPOSE 4000

Set environment

ENV NODE_ENV=production

Start the application

CMD ["node", "dist/index.js"]