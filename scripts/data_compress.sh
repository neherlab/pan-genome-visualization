#!/usr/bin/env bash

# Compress data files
#
# Dependencies:
#   apt-get install -y bash brotli parallel pigz

set -euo pipefail

export INPUT_DIR="${1:? Usage: $0 INPUT_DIR}"

if [ ! -d "${INPUT_DIR}/dataset/" ]; then
  echo "Invalid input directory: '${INPUT_DIR}'. Input directory should contain subdirectory 'dataset/'"
fi

if [ ! -f "${INPUT_DIR}/index.json" ]; then
  echo "Invalid input directory: '${INPUT_DIR}'. Input directory should contain 'index.json'"
fi

function list_compressible_files() {
  find "${INPUT_DIR}" -type f -not -regex '.*\.\(gz\|br\|lz.?\|xz\|zstd?\|zip\|\)' -print0
}
export -f list_compressible_files

function compress_br() {
  list_compressible_files | parallel -0 nice -15 brotli -kf
}
export -f compress_br

function compress_gz() {
  list_compressible_files | parallel -0 nice -15 pigz -kf
}
export -f compress_gz

parallel ::: compress_gz compress_br
