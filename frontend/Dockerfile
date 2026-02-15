FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN yarn install --production=false

COPY . .

ENV DISABLE_ESLINT_PLUGIN=true
EXPOSE 3000

CMD ["yarn", "start"]
