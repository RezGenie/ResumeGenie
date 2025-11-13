#!/usr/bin/env bash
set -euo pipefail

# Build the backend image (used by backend-tests service)
DOCKER_COMPOSE=${DOCKER_COMPOSE:-docker compose}

$DOCKER_COMPOSE build backend-tests

# Run tests in the container
set +e
$DOCKER_COMPOSE run --rm backend-tests
STATUS=$?
set -e

# Clean up the ephemeral container
$DOCKER_COMPOSE rm -f backend-tests >/dev/null 2>&1 || true

exit ${STATUS}
