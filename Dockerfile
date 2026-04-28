FROM node:20-slim

# Install system dependencies for privilege dropping, Hermes, and OpenCode
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  git \
  gosu \
  python3 \
  python3-pip \
  && rm -rf /var/lib/apt/lists/*

# Install uv for Hermes Python package installation
RUN pip3 install --no-cache-dir uv

ARG HERMES_REF=main

# Create a non-root user (required: Claude CLI refuses --dangerously-skip-permissions as root)
RUN groupadd -r paperclip && useradd -r -g paperclip -m -d /paperclip -s /bin/bash paperclip

# Create the paperclip home directory (Railway volume mount point)
RUN mkdir -p /paperclip/.hermes /paperclip/.config/opencode && chown -R paperclip:paperclip /paperclip

ENV HOME=/paperclip
ENV PAPERCLIP_HOME=/paperclip
ENV HERMES_HOME=/paperclip/.hermes
ENV OPENCODE_INSTALL_DIR=/usr/local/bin

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN npm install --omit=dev

# Install OpenCode globally and Hermes from source
RUN npm install -g opencode-ai && \
  git clone --depth 1 --branch ${HERMES_REF} https://github.com/NousResearch/hermes-agent.git /opt/hermes-agent && \
  cd /opt/hermes-agent && \
  uv pip install --system --no-cache -e ".[all]" && \
  cd /opt/hermes-agent/web && npm install --silent && npm run build && \
  cd /opt/hermes-agent/ui-tui && npm install --silent --no-fund --no-audit --progress=false && npm run build && \
  rm -rf /opt/hermes-agent/web /opt/hermes-agent/.git /root/.npm

# Copy application code
COPY . .

# Give ownership of everything to the non-root user
RUN chown -R paperclip:paperclip /app /paperclip /opt/hermes-agent

# Copy and set up entrypoint (fixes volume mount ownership at runtime)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Railway injects PORT at runtime (default 3100)
ENV PORT=3100
EXPOSE 3100

# Entrypoint runs as root to fix volume permissions, then drops to paperclip user
ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "start"]
