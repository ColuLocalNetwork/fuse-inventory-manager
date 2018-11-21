FROM node:10-alpine

RUN apk add  \
    build-base \
    python \
    jq \
    iptables \
    vim \
    bash \
    curl \
    git

ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN npm i -g nodemon truffle
RUN mkdir -p /inventory-manager && cp -a /tmp/node_modules /inventory-manager

WORKDIR /inventory-manager
COPY . /inventory-manager
