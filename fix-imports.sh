#!/bin/bash

# Find all TypeScript files in the app/api directory
find app/api -name "*.ts" -type f | while read -r file; do
  # Replace @/lib/prisma with relative path
  sed -i 's|@/lib/prisma|../../../lib/prisma|g' "$file"
  
  # For files in subdirectories, we need more "../"
  depth=$(echo "$file" | tr -cd '/' | wc -c)
  rel_path=""
  
  # Calculate relative path based on file depth
  # Base depth for app/api/X/route.ts is 3 (3 directories deep)
  if [ $depth -gt 3 ]; then
    extra_levels=$((depth - 3))
    for i in $(seq 1 $extra_levels); do
      rel_path="${rel_path}../"
    done
    
    # Replace the first match with the calculated path
    sed -i "0,/..\/..\/..\/lib\/prisma/s|..\/..\/..\/lib\/prisma|${rel_path}../../lib/prisma|g" "$file"
  fi
  
  echo "Fixed imports in $file"
done
