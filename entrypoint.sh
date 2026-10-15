#!/bin/bash
set -e

# Fix ownership of the Railway volume mount at /paperclip
# Railway mounts volumes as root, but we need the paperclip user to write to it
if [ -d "/paperclip" ]; then
  chown -R paperclip:paperclip /paperclip 2>/dev/null || true
fi

# Configure GitHub auth at runtime if GITHUB_TOKEN is set
if [ -n "$GITHUB_TOKEN" ]; then
  git config --global credential.helper store
  echo "https://x-access-token:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
  chmod 600 ~/.git-credentials
fi

# Drop privileges and run the actual command as the paperclip user
exec gosu paperclip "$@"
