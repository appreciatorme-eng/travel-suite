#!/bin/bash
set -e

# Initialize Git if not already initialized
if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
    git branch -M main
fi

# Add all files
echo "Adding files to staging..."
git add .

# Commit changes
echo "Committing changes..."
git commit -m "feat: complete project release prep (security hardening, documentation, cleanup)"

# Check for remote 'origin'
if ! git remote | grep -q origin; then
    echo "No remote 'origin' found."
    if command -v gh &> /dev/null; then
        echo "Creating GitHub repository using gh CLI..."
        # Change 'public' to 'private' if preferred
        gh repo create travel-suite --public --source=. --remote=origin
    else
        echo "GitHub CLI (gh) not installed."
        echo "Please create a repository on GitHub and run:"
        echo "  git remote add origin <your-repo-url>"
        exit 1
    fi
fi

# Push to origin
echo "Pushing to GitHub..."
git push -u origin main

echo "Done! 🚀"
