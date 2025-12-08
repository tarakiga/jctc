#!/bin/bash
set -e

echo "Starting production initialization..."

# Run Alembic migrations
echo "Running database migrations..."
alembic upgrade head

# Seed lookup values
echo "Seeding lookup dictionary..."
python -m scripts.seed_lookup_values

# Create super admin
echo "Provisioning super admin..."
python -m scripts.create_super_admin

echo "Initialization complete!"
