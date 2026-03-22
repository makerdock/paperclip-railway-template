#!/bin/sh
set -e
# When Railway mounts a volume at /paperclip it is often not writable by the node user.
# Create dirs Paperclip needs and ensure the whole tree is owned by node.
mkdir -p /paperclip/instances/default/logs
chown -R node:node /paperclip

# Persist Claude subscription auth across redeployments.
# Set CLAUDE_SETUP_TOKEN in Railway env vars (from `claude setup-token` output).
if [ -n "$CLAUDE_SETUP_TOKEN" ]; then
  echo "Setting up Claude auth from CLAUDE_SETUP_TOKEN..."
  # setup-token reads the token from stdin
  echo "$CLAUDE_SETUP_TOKEN" | gosu node claude setup-token 2>/dev/null && \
    echo "Claude auth configured." || \
    echo "Warning: Claude setup-token failed. Agents using Claude subscription may not work."
fi

exec gosu node "$@"
