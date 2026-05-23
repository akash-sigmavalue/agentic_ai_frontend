FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL=/api

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]