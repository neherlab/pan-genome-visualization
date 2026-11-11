# syntax=docker/dockerfile:1
# check=experimental=all
#
# Development image of panX: mise and the tools of .config/mise.lock, and the
# host user. dev/docker/run builds it and runs every command in it as the host
# user. The layers go from the inputs that change least to those that change
# most, so a tool update rebuilds only the last layer.
FROM debian:13-slim@sha256:f6b08b09a05725f9431502d3b5714f5c4576e82c1a84fa1debe0c24a7e0c3ec4
SHELL ["bash", "-euxo", "pipefail", "-c"]

RUN set -euxo pipefail >/dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq \
&& apt-get install --no-install-recommends --yes -qq \
  ca-certificates \
  curl \
  git \
  unzip \
  xz-utils \
>/dev/null \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

ARG USER_ID
ARG GROUP_ID
ARG USER_NAME
ARG GROUP_NAME
ARG USER_HOME
COPY "dev/docker/files/create-user" "/"
RUN set -euxo pipefail >/dev/null \
&& /create-user "${USER_ID}" "${GROUP_ID}" "${USER_NAME}" "${GROUP_NAME}" "${USER_HOME}" \
&& rm "/create-user"

# mise reads its tools from MISE_DATA_DIR in every container; its cache and
# state are written per container under /tmp.
ENV MISE_DATA_DIR="/opt/mise"
ENV MISE_CACHE_DIR="/tmp/mise/cache"
ENV MISE_STATE_DIR="/tmp/mise/state"
COPY "dev/docker/files/fetch" "dev/docker/files/checksums" "dev/docker/files/install-mise" "dev/docker/files/mise-version" "/tmp/install-mise/"
RUN set -euxo pipefail >/dev/null \
&& /tmp/install-mise/install-mise "/usr/local/bin" \
&& rm -rf "/tmp/install-mise"

# mise installs every tool of .config/mise.toml at the URL and sha256 of
# .config/mise.lock and links their executables into /usr/local/bin, so the
# tools also run outside `mise exec`.
COPY ".config/mise.toml" ".config/mise.lock" "/tmp/mise/project/.config/"
RUN set -euxo pipefail >/dev/null \
&& export MISE_TRUSTED_CONFIG_PATHS="/tmp/mise/project" \
&& mise -C "/tmp/mise/project" install \
&& mise -C "/tmp/mise/project" bin-paths | while IFS= read -r dir; do \
  find -L "${dir}" -mindepth 1 -maxdepth 1 -type f -executable -exec ln -sf -t "/usr/local/bin" {} + || exit 1; \
done \
&& chmod -R a+rX "${MISE_DATA_DIR}" \
&& rm -rf "/tmp/mise" \
&& bun --version \
&& just --version
