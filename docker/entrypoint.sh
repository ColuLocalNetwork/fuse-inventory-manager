#!/bin/bash

sysctl -w net.ipv4.conf.all.route_localnet=1

MONGO=$(ping -c 1 -w 1 "$mongodb_container" | awk -F'[()]' '/PING/{print $2}')
CORE=$(ping -c 1 -w 1 "$im_container" | awk -F'[()]' '/PING/{print $2}')

iptables -I OUTPUT -t nat -o lo -d localhost -p tcp --dport 27017 -j DNAT --to-destination ${MONGO}:27017
iptables -I POSTROUTING -t nat -p tcp --dport 27017 -d ${MONGO} -j SNAT --to ${CORE}

mv "/inventory-manager/node_modules" "/$im_container/"
cd "/$im_container"
$to_execute
