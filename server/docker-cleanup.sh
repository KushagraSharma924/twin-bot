#!/bin/bash

# Script to clean up unused Docker resources

echo "Cleaning up Docker resources..."

# Remove stopped containers
echo "Removing stopped containers..."
docker container prune -f

# Remove unused images
echo "Removing dangling images..."
docker image prune -f

# Remove unused volumes (careful with this one)
echo "Removing unused volumes..."
docker volume prune -f

# Remove build cache
echo "Removing build cache..."
docker builder prune -f

echo "Docker cleanup complete!"

# Show current disk usage
echo "Current Docker disk usage:"
docker system df 