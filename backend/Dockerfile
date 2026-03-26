FROM node:20-alpine AS base

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

# Generate Prisma client BEFORE building the NestJS app
RUN npx prisma generate

RUN npm run build

# Use the PORT environment variable provided by Railway
ENV PORT=3001
EXPOSE ${PORT}

CMD ["npm", "run", "start:prod"]

