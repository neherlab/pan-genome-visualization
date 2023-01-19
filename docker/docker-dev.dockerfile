# Freeze base image version to
# ubuntu:20.04 (pushed 2022-08-02T01:37:38.492367Z)
# https://hub.docker.com/layers/ubuntu/library/ubuntu/20.04/images/sha256-a06ae92523384c2cd182dcfe7f8b2bf09075062e937d5653d7d0db0375ad2221
FROM ubuntu@sha256:a06ae92523384c2cd182dcfe7f8b2bf09075062e937d5653d7d0db0375ad2221

SHELL ["bash", "-euxo", "pipefail", "-c"]

ARG NODEMON_VERSION="2.0.15"
ARG YARN_VERSION="1.22.18"

RUN set -euxo pipefail >/dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  apt-transport-https \
  bash \
  bash-completion \
  brotli \
  build-essential \
  ca-certificates \
  curl \
  git \
  gnupg \
  libssl-dev \
  lsb-release \
  parallel \
  pigz \
  pixz \
  pkg-config \
  python3 \
  python3-pip \
  rename \
  sudo \
  time \
  xz-utils \
>/dev/null \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& rm -rf /var/lib/apt/lists/*

ARG USER=user
ARG GROUP=user
ARG UID
ARG GID

ENV USER=$USER
ENV GROUP=$GROUP
ENV UID=$UID
ENV GID=$GID
ENV TERM="xterm-256color"
ENV HOME="/home/${USER}"
ENV NODE_DIR="/opt/node"
ENV PATH="${HOME}/.bin:${HOME}/.local/bin:${NODE_DIR}/bin:${PATH}"

# Install Node.js
COPY .nvmrc /
RUN set -euxo pipefail >/dev/null \
&& mkdir -p "${NODE_DIR}" \
&& cd "${NODE_DIR}" \
&& NODE_VERSION=$(cat /.nvmrc) \
&& curl -fsSL  "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" | tar -xJ --strip-components=1 \
&& npm install -g nodemon@${NODEMON_VERSION} yarn@${YARN_VERSION} >/dev/null \
&& npm config set scripts-prepend-node-path auto \

# Calm down the (in)famous chatter from yarn
RUN set -euxo pipefail >/dev/null \
&& sed -i'' "s/this.reporter.warn(this.reporter.lang('incompatibleResolutionVersion', pattern, reqPattern));//g" "${NODE_DIR}/lib/node_modules/yarn/lib/cli.js" \
&& sed -i'' "s/_this2\.reporter.warn(_this2\.reporter.lang('ignoredScripts'));//g" "${NODE_DIR}/lib/node_modules/yarn/lib/cli.js" \
&& sed -i'' 's/_this3\.reporter\.warn(_this3\.reporter\.lang(peerError.*;//g' "/opt/node/lib/node_modules/yarn/lib/cli.js"

# Make a user and group
RUN set -euxo pipefail >/dev/null \
&& \
  if [ -z "$(getent group ${GID})" ]; then \
    groupadd --system --gid ${GID} ${GROUP}; \
  else \
    groupmod -n ${GROUP} $(getent group ${GID} | cut -d: -f1); \
  fi \
&& \
  if [ -z "$(getent passwd ${UID})" ]; then \
    useradd \
      --system \
      --create-home --home-dir ${HOME} \
      --shell /bin/bash \
      --gid ${GROUP} \
      --groups sudo \
      --uid ${UID} \
      ${USER}; \
  fi \
&& sed -i /etc/sudoers -re 's/^%sudo.*/%sudo ALL=(ALL:ALL) NOPASSWD: ALL/g' \
&& sed -i /etc/sudoers -re 's/^root.*/root ALL=(ALL:ALL) NOPASSWD: ALL/g' \
&& sed -i /etc/sudoers -re 's/^#includedir.*/## **Removed the include directive** ##"/g' \
&& echo "foo ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers \
&& touch ${HOME}/.hushlogin \
&& chown -R ${UID}:${GID} "${HOME}"


USER ${USER}

# Setup bash
RUN set -euxo pipefail >/dev/null \
&& echo 'alias ll="ls --color=always -alFhp"' >> ~/.bashrc \
&& echo 'alias la="ls -Ah"' >> ~/.bashrc \
&& echo 'alias l="ls -CFh"' >> ~/.bashrc \
&& echo 'function mkcd() { mkdir -p ${1} && cd ${1} ; }' >> ~/.bashrc \
&& echo "source ~/.bash_completion" >> ~/.bashrc

USER ${USER}

WORKDIR /workdir
