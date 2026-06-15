#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-https://mdevtech.vercel.app}"
SITEMAP="${DOMAIN}/sitemap.xml"

echo "Submit this sitemap in Google Search Console: ${SITEMAP}"
echo "Then request indexing for: ${DOMAIN}/ and the latest post URLs."
