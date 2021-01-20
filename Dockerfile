FROM node:12

ARG NODE_ENV=development
ARG TZ=Europe/Vienna

ENV NODE_ENV=${NODE_ENV}
ENV TZ=${TZ}

USER root
#RUN echo " ---> Installing Debian Packages" && \
#    apt-get update -q -y && \
#    apt-get install -q -y --no-install-recommends ...

RUN echo " ---> Create Directories" && \
    mkdir -p /opt/signal-gateway && \
    chown -R node:node /opt/signal-gateway

USER node
WORKDIR /opt/signal-gateway

VOLUME [ "/var/lib/signal-gateway" ]

COPY package.json package-lock.json entrypoint.sh src /opt/signal-gateway/

RUN echo " ---> Installing Node Packages" && \
    NODE_ENV=development npm ci && \
    echo " ---> Compiling TypeScript" && \
    npm run build

# exec needed to get PID 1, to which docker sends SIGTERM
CMD exec /opt/signal-gateway/entrypiont.sh
