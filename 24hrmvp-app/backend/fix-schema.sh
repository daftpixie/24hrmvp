#!/bin/bash

# Add lastSeenAt to User model
sed -i '/updatedAt.*DateTime.*@updatedAt/a\  lastSeenAt        DateTime?' prisma/schema.prisma

# Verify the change
echo "Updated User model:"
grep -A 5 "updatedAt" prisma/schema.prisma | head -n 10
