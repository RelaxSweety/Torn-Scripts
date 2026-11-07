#!/usr/bin/env bash
# Explicit asset maintenance only; normal builds consume committed assets.
set -euo pipefail
asset_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../assets" && pwd)"
for size in 128 256; do
  convert "$asset_dir/tu-logo-integrated-gold.png" -filter Lanczos -resize "${size}x${size}" -define webp:lossless=true "$asset_dir/tu-logo-${size}.webp"
done
