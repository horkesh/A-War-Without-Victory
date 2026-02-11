#!/usr/bin/env bash
# Phase H6.4.1 — Run H6.2 terrain snapshots in container (osmium + gdalwarp)
# Usage: ./tools/terrain_toolchain/run_h6_2_snapshots.sh [--only=osm|dem|all]
# Default: --only=all

set -e

ONLY="all"
for arg in "$@"; do
  case "$arg" in
    --only=osm)  ONLY="osm" ;;
    --only=dem)  ONLY="dem" ;;
    --only=all)  ONLY="all" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IMAGE_NAME="awwv-terrain-h6_2"
IMAGE_TAG="h6.4.1"

echo "=== Phase H6.4.1 container runner ==="
echo "Repo root: $REPO_ROOT"
echo "Only: $ONLY"
echo ""

# Verify Docker
if ! command -v docker &>/dev/null; then
  echo "ERROR: docker not found. Install Docker and ensure it is on PATH."
  exit 1
fi
docker --version
if ! docker info &>/dev/null; then
  echo "ERROR: docker info failed. Is Docker daemon running?"
  exit 1
fi

# Build image if not present
if ! docker image inspect "${IMAGE_NAME}:${IMAGE_TAG}" &>/dev/null; then
  echo "Building ${IMAGE_NAME}:${IMAGE_TAG}..."
  docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" "$SCRIPT_DIR"
fi

# Mount repo; mount node_modules from host if present (avoids slow npm ci)
MOUNT_NODE_MODULES=""
if [ -d "$REPO_ROOT/node_modules" ]; then
  MOUNT_NODE_MODULES="-v $REPO_ROOT/node_modules:/work/node_modules:ro"
  echo "Using host node_modules (read-only mount)"
else
  echo "node_modules not present on host; will run npm ci in container"
fi

run_in_container() {
  docker run --rm \
    -v "$REPO_ROOT:/work" \
    $MOUNT_NODE_MODULES \
    -w /work \
    "${IMAGE_NAME}:${IMAGE_TAG}" \
    "$@"
}

# Task C: Print tool versions (paste into ledger)
echo "=== Tool versions (paste into ledger) ==="
run_in_container bash -c '
  echo "osmium: $(osmium --version 2>/dev/null || echo "?")"
  echo "gdalwarp: $(gdalwarp --version 2>&1 | head -1)"
  echo "node: $(node --version)"
  echo "npm: $(npm --version)"
'
echo ""

# npm ci if node_modules not mounted
if [ -z "$MOUNT_NODE_MODULES" ]; then
  echo "Running npm ci..."
  run_in_container npm ci
  echo ""
fi

# Run snapshots
if [ "$ONLY" = "osm" ] || [ "$ONLY" = "all" ]; then
  echo "Running OSM terrain snapshot..."
  run_in_container npm run map:snapshot:osm-terrain:h6_2
  echo ""
fi

if [ "$ONLY" = "dem" ] || [ "$ONLY" = "all" ]; then
  echo "Running DEM clip snapshot..."
  run_in_container npm run map:snapshot:dem-clip:h6_2
  echo ""
fi

# Validations
echo "Running validations..."
run_in_container npm run map:contracts:validate
run_in_container npm run typecheck
run_in_container npm test
echo ""
echo "=== H6.2 snapshots complete. Outputs in data/derived/terrain/ ==="
