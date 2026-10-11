#!/usr/bin/env bash
# ========================================================
# Automated AWS S3 & CloudFront Deployment Script
# UCU StatHustle Exam Platform
# ========================================================

set -e

BUCKET="ucu-prob-stat-midterm2-297580066889"
DIST_ID="E2UK10QS80X0PZ"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Deploying UCU StatHustle to AWS S3: s3://${BUCKET}..."

aws s3 sync "${DIR}" "s3://${BUCKET}/" \
    --exclude "*" \
    --include "index.html" \
    --include "css/*" \
    --include "js/*" \
    --include "vendor/*" \
    --include "assets/*" \
    --delete

echo "🔄 Invalidating CloudFront cache (Distribution: ${DIST_ID})..."
aws cloudfront create-invalidation --distribution-id "${DIST_ID}" --paths "/*" > /dev/null

echo "✅ Deployment complete!"
echo "🌐 S3 Website (HTTP):        http://${BUCKET}.s3-website-us-east-1.amazonaws.com"
echo "🔒 CloudFront CDN (HTTPS):   https://d3kruktobo9kb2.cloudfront.net"
