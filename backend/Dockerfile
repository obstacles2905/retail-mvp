FROM node:20-alpine AS base

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

# Generate Prisma client BEFORE building the NestJS app
RUN npx prisma generate

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]

