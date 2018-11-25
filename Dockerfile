FROM node:latest
WORKDIR /app
RUN npm i -g nodemon
ADD package.json package.json
ADD package-lock.json package-lock.json
RUN npm i