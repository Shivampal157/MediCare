FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 4000 4001 4002 4003 4004

CMD ["npm", "run", "start:gateway"]
