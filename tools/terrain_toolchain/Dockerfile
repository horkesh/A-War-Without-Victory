# Phase H6.4.1 — Pinned terrain toolchain for H6.2 snapshot scripts
# Base: node (LTS) on Debian Bookworm
# Includes: osmium-tool, gdal-bin (gdalwarp), gzip, coreutils
# No :latest; pin exact base tag for reproducibility

FROM node:22.12.0-bookworm

# Install osmium-tool and GDAL; record versions at build time
# apt packages: fixed by Debian bookworm snapshot; versions in apt list
RUN apt-get update && apt-get install -y --no-install-recommends \
    osmium-tool \
    gdal-bin \
    gzip \
    ca-certificates \
    coreutils \
    && rm -rf /var/lib/apt/lists/*

# Verify tools work
RUN osmium --version && gdalwarp --version

WORKDIR /work
