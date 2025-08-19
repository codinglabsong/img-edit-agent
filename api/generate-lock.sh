#!/bin/bash

# Generate lock file for reproducible builds
echo "Generating pyproject.lock file..."
uv lock

echo "Lock file generated successfully!"
