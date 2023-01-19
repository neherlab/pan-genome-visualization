#!/usr/bin/env bash

# Compress data files
#
# You need to configure AWS credentials in order to run this script. Reach out to your AWS admin.
# It is recommended to use tool like aws-vault (https://github.com/99designs/aws-vault) to store your AWS credentials
# securely.
#
# Dependencies:
#   apt-get install -y curl parallel sudo unzip
#   curl -fsSL -o "awscliv2.zip" "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip"
#   unzip -oqq awscliv2.zip
#   sudo ./aws/install --update

set -euo pipefail

export INPUT_DIR="${1:? Usage: $0 INPUT_DIR S3_BUCKET}"
export S3_BUCKET="${2:? Usage: $0 INPUT_DIR S3_BUCKET}"

export AWS_MAX_ATTEMPTS=10

function content_encoding() {
  case "$1" in
    *.gz) echo --content-encoding=gzip;;
    *.br) echo --content-encoding=br;;
    *)    echo '';;
  esac
}
export -f content_encoding

function content_type() {
  # Strip compression from the filename
  f="${1%.gz}"
  f="${f%.br}"

  case "${f}" in
    *.apng)               echo --content-type=image/apng;;
    *.avif)               echo --content-type=image/avif;;
    *.bib)                echo --content-type=application/x-bibtex;;
    *.bz2)                echo --content-type=application/x-bzip2;;
    *.css)                echo --content-type=text/css;;
    *.csv)                echo --content-type=text/csv;;
    *.gif)                echo --content-type=image/gif;;
    *.htm | *.html)       echo --content-type=text/html;;
    *.ico)                echo --content-type=image/x-icon;;
    *.jpg | *.jpeg)       echo --content-type=image/jpeg;;
    *.js | *.cjs | *.mjs) echo --content-type=text/javascript;;
    *.json)               echo --content-type=application/json;;
    *.ndjson)             echo --content-type=application/x-ndjson;;
    *.pb | *.pb2 | *.pb3) echo --content-type=application/x-protobuf;;
    *.pdf)                echo --content-type=application/pdf;;
    *.png)                echo --content-type=image/png;;
    *.svg)                echo --content-type=image/svg+xml;;
    *.tar)                echo --content-type=application/x-tar;;
    *.tsv)                echo --content-type=text/tab-separated-values;;
    *.txt)                echo --content-type=text/plain;;
    *.wasm)               echo --content-type=application/wasm;;
    *.webp)               echo --content-type=image/webp;;
    *.xml)                echo --content-type=application/xml;;
    *.xz)                 echo --content-type=application/x-xz;;
    *.zip)                echo --content-type=application/zip;;
    *.zst)                echo --content-type=application/zstd;;
    *)                    echo --content-type=application/octet-stream;;
  esac
}
export -f content_type

function upload() {
  src="${1}"
  dst="${S3_BUCKET}/${1}"
  echo "${src} -> ${dst}"
  aws s3 cp --only-show-errors --cache-control "no-cache" $(content_encoding "${1}") $(content_type "${1}") "${src}" "${dst}"
}
export -f upload

pushd "${INPUT_DIR}" >/dev/null
  nice -15 find * -maxdepth 1 -type f -print0 | nice -15 parallel -j10 -0 upload
  nice -15 find "dataset"/* -type f -print0   | nice -15 parallel -j10 -0 upload
popd >/dev/null
