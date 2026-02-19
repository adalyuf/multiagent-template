FROM node:20 AS ai-devcontainer

ARG CLAUDE_CODE_VERSION=latest

# Use the official GitHub CLI apt repo to avoid outdated distro-pinned gh builds.
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  wget \
  gnupg2 \
  && mkdir -p -m 755 /etc/apt/keyrings \
  && wget -qO /etc/apt/keyrings/githubcli-archive-keyring.gpg https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Install basic development tools and iptables/ipset
RUN apt-get update && apt-get install -y --no-install-recommends \
  less \
  git \
  procps \
  sudo \
  fzf \
  zsh \
  man-db \
  unzip \
  gh \
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  jq \
  nano \
  vim \
  xdg-utils \
  locales \
  tzdata \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Configure locale and timezone defaults for East Coast US (Boston)
RUN sed -i 's/^# *\(en_US.UTF-8 UTF-8\)/\1/' /etc/locale.gen && \
  locale-gen en_US.UTF-8 && \
  update-locale LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 && \
  ln -snf /usr/share/zoneinfo/America/New_York /etc/localtime && \
  echo America/New_York > /etc/timezone

# Ensure default node user has access to /usr/local/share
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share

ARG USERNAME=node

# Persist bash history.
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  && mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && chown -R $USERNAME /commandhistory

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true
ENV TZ=America/New_York
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# Create workspace and config directories and set permissions
RUN mkdir -p /workspace /home/node/.claude /home/node/.config/gh /home/node/.codex /home/node/.railway /home/node/.gemini && \
  chown -R node:node /workspace /home/node/.claude /home/node/.config /home/node/.codex /home/node/.railway /home/node/.gemini

# Allow node user passwordless sudo (needed for postCreateCommand to fix volume mount ownership)
RUN echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node && \
  chmod 0440 /etc/sudoers.d/node

WORKDIR /workspace

ARG GIT_DELTA_VERSION=0.18.2
RUN ARCH=$(dpkg --print-architecture) && \
  wget "https://github.com/dandavison/delta/releases/download/${GIT_DELTA_VERSION}/git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  sudo dpkg -i "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  rm "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb"

# Set up non-root user
USER node

# Install global packages
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin

# Set the default shell to zsh rather than sh
ENV SHELL=/bin/zsh

# Set the default editor and visual
ENV EDITOR=nano
ENV VISUAL=nano

# Default powerline10k theme
ARG ZSH_IN_DOCKER_VERSION=1.2.0
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v${ZSH_IN_DOCKER_VERSION}/zsh-in-docker.sh)" -- \
  -p git \
  -p fzf \
  -a "source /usr/share/doc/fzf/examples/key-bindings.zsh" \
  -a "source /usr/share/doc/fzf/examples/completion.zsh" \
  -a "export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  -x

# Install AI Agents and tooling
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}
RUN npm i -g @openai/codex
RUN npm install -g @railway/cli

# Cline currently has issues authenticating in the redirect
RUN npm install -g cline
# Gemini takes 6 minutes for a 30s query, currently unusable
RUN npm install -g @google/gemini-cli
# Opencode hits a lot of rate limits, kilocode seems like a fork of opencode and so far has had faster and more reliable API access
RUN npm install -g opencode-ai
RUN npm install -g @kilocode/cli