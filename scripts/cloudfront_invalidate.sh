#!/usr/bin/env bash
set -euo pipefail
trap "exit" INT

export AWS_CLOUDFRONT_DISTRIBUTION_ID="${1:? Usage: $0 AWS_CLOUDFRONT_DISTRIBUTION_ID}"

export AWS_MAX_ATTEMPTS=10

# Update Cloudfront cache
aws cloudfront create-invalidation \
  --no-paginate \
  --distribution-id ${AWS_CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*" \
  >/dev/null
