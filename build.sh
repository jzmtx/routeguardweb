#!/usr/bin/env bash
# Build script for Render.com

set -o errexit

# Install dependencies
pip install -r requirements.txt

# Collect static files
echo "Running collectstatic..."
python manage.py collectstatic --no-input

# Run migrations
echo "Running migrations..."
python manage.py migrate
