#!/usr/bin/env bash

sysctl -w net.ipv4.conf.all.route_localnet=1

MONGO=$(ping -c 1 mongo | awk -F'[()]' '/PING/{print $2}')
APP=$(ping -c 1 inventory-manager-development | awk -F'[()]' '/PING/{print $2}')

iptables -I OUTPUT -t nat -o lo -d localhost -p tcp --dport 27017 -j DNAT --to-destination ${MONGO}:27017
iptables -I POSTROUTING -t nat -p tcp --dport 27017 -d ${MONGO} -j SNAT --to ${APP}


cd /inventory-manager
rm -rf node_modules package-lock.json > /dev/null 2>&1
rm -rf packages/core/node_modules packages/core/package-lock.json 2>&1
npm --quiet install -g nodemon

bash
