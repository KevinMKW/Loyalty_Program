FROM node:18-alpine

WORKDIR /path

COPY package*.json ./

RUN npm install 

COPY . .

EXPOSE 3000

CMD ["npm", "server.js"]