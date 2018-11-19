FROM node:10

WORKDIR /inventory-manager

COPY  entrypoint.sh /

RUN echo "deb http://ftp.us.debian.org/debian unstable main contrib non-free" >> /etc/apt/sources.list.d/unstable.list && \
    apt-get update && \
    apt-get -y install --no-install-recommends \
    build-essential \
    jq \
    iptables \
    python \
    vim \
    nano && \
    apt-get -y install --no-install-recommends \
    -t unstable gcc-5 && \
    rm -rf /var/lib/apt/lists/*

EXPOSE 7545 8081
