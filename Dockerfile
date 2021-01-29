FROM node:12

ARG NODE_ENV=development
ARG TZ=Europe/Vienna

ENV NODE_ENV=${NODE_ENV}
ENV TZ=${TZ}
ENV SEEDS_DIR=/var/lib/signal-gateway-seeds

USER root
RUN if [ "$NODE_ENV" = development ]; then \
        echo " ---> Installing Debian Packages" && \
        apt-get update -q -y && \
        apt-get install -q -y --no-install-recommends vim curl && \
        echo $'source $VIMRUNTIME/mswin.vim\nsyntax on\nset autoindent\nset hlsearch\nset mouse-=a' > /root/.vimrc; \
    fi

RUN echo " ---> Create Directories" && \
    mkdir -p /opt/signal-gateway /var/lib/signal-gateway-seeds && \
    chown -R node:node /opt/signal-gateway

WORKDIR /opt/signal-gateway

VOLUME [ "/var/lib/signal-gateway", "/var/lib/signal-gateway-seeds" ]

COPY LICENSE.txt package.json package-lock.json /opt/signal-gateway/

RUN echo " ---> Installing Node Packages" && \
    NODE_ENV=development npm ci

COPY .sequelizerc tsconfig.json entrypoint.sh /opt/signal-gateway/
COPY src /opt/signal-gateway/src/

RUN echo " ---> Compiling TypeScript" && \
    npm run build && \
    if [ "$NODE_ENV" != development ]; then \
        echo " ---> Pruning Development Packages" && \
        npm prune; \
    fi

USER node

# exec needed to get PID 1, to which docker sends SIGTERM
CMD exec /opt/signal-gateway/entrypoint.sh
