FROM node:latest
VOLUME /app
WORKDIR /app
# Bump npm
ARG VERSION=3
RUN apt-get update
RUN apt-get install -y apt-utils
RUN apt-get install -y build-essential libstdc++6 gcc g++
RUN npm i -g nodemon node-gyp
COPY . .
RUN npm install
