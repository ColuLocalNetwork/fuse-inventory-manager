#!/usr/bin/env sh

docker stop im_development-mongo
docker rm -v im_development-mongo
docker volume rm development_mongo
docker network rm development_default
