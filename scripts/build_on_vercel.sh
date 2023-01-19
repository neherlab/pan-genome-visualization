#!/usr/bin/env bash

set -euxo pipefail
trap "exit" INT

# Directory where this script resides
THIS_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")"
  pwd
)"

# Where the source code is
PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/..)"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

# Vercel seems to be currently using VMs provisioned with Amazon Linux 2, which is a derivative of RHEL 7,
# If something breaks, perhaps they've changed things.
cat /etc/os-release
cat /etc/image-id
cat /etc/system-release
echo "RHEL version: $(rpm -E '%{rhel}' || echo 'unknown')"

nproc
cat /proc/cpuinfo

# Remove some dead symlinks which cause log pollution
rm -f /lib64/libvips-cpp.so.42
rm -f /lib64/libvips.so.42

# Disable yum fastestmirror plugin. It only makes things slower.
printf "[main]\nenabled=0\n" >"/etc/yum/pluginconf.d/fastestmirror.conf"

yum install -y -q \
  gzip \
  tar \
  xz

# Remove some dead symlinks which cause log pollution
rm -f /lib64/libvips-cpp.so.42
rm -f /lib64/libvips.so.42

# Vercel caches `node_modules/`, so let's put our caches there
export CACHE_DIR="node_modules/.cache"

mkdir -p "${CACHE_DIR}"

export PATH=${HOME}/.local/bin:/usr/sbin${PATH:+":$PATH"}

mkdir -p "${CACHE_DIR}/.build"
ln -s "${CACHE_DIR}/.build" ".build"

mkdir -p "${CACHE_DIR}/.cache"
ln -s "${CACHE_DIR}/.cache" ".cache"

mkdir -p "${CACHE_DIR}/.build_web"
ln -s "${CACHE_DIR}/.build_web" ".build"

mkdir -p "${CACHE_DIR}/.cache_web"
ln -s "${CACHE_DIR}/.cache_web" ".cache"

mkdir -p "${CACHE_DIR}/node_modules"
ln -s "${CACHE_DIR}/node_modules" "node_modules"

cp ".env.example" ".env"

yarn install --frozen-lockfile

yarn prod:build
