#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────
#  BeaconOS — Bootstrap Installer
#  Auto-installs git, Node.js/npm, builds the project, and
#  registers the `beaconos` CLI globally.
# ──────────────────────────────────────────────────────────

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
NC="\033[0m" # No Colour

log()  { echo -e "${GREEN}✔${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✖${NC} $1"; }
info() { echo -e "${CYAN}→${NC} $1"; }

# --- Detect OS / package manager -------------------------------------------
detect_pkg_manager() {
  if   command -v apt-get &>/dev/null; then
    PKG_MANAGER="apt"
    INSTALL_CMD="sudo apt-get install -y"
    UPDATE_CMD="sudo apt-get update -qq"
  elif command -v dnf &>/dev/null; then
    PKG_MANAGER="dnf"
    INSTALL_CMD="sudo dnf install -y"
    UPDATE_CMD=""
  elif command -v yum &>/dev/null; then
    PKG_MANAGER="yum"
    INSTALL_CMD="sudo yum install -y"
    UPDATE_CMD=""
  elif command -v pacman &>/dev/null; then
    PKG_MANAGER="pacman"
    INSTALL_CMD="sudo pacman -S --noconfirm"
    UPDATE_CMD=""
  elif command -v zypper &>/dev/null; then
    PKG_MANAGER="zypper"
    INSTALL_CMD="sudo zypper install -y"
    UPDATE_CMD=""
  elif [[ "$(uname)" == "Darwin" ]]; then
    PKG_MANAGER="brew"
    INSTALL_CMD="brew install"
    UPDATE_CMD="brew update"
  else
    PKG_MANAGER=""
  fi
}

install_git() {
  if command -v git &>/dev/null; then
    log "Git is already installed ($(git --version))."
    return 0
  fi
  info "Installing git…"
  case "$PKG_MANAGER" in
    apt)   $INSTALL_CMD git ;;
    dnf|yum|zypper) $INSTALL_CMD git ;;
    pacman) $INSTALL_CMD git ;;
    brew)  $INSTALL_CMD git ;;
    *)
      warn "Could not auto-install git. Please install it manually, then re-run this script."
      return 1
      ;;
  esac
  log "Git installed ($(git --version))."
}

install_node() {
  if command -v node &>/dev/null; then
    NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VER" -lt 18 ]; then
      warn "Node.js $(node --version) is too old. BeaconOS requires Node.js 18+."
      warn "Upgrading via the system package manager…"
    else
      log "Node.js $(node --version) detected."
      return 0
    fi
  fi

  # Decide how to install Node.js 18+
  info "Installing Node.js (18+) and npm…"

  # Prefer nvm if already present
  if [ -n "${NVM_DIR:-}" ] || [ -f "$HOME/.nvm/nvm.sh" ]; then
    info "nvm detected — using nvm to install Node.js 18+."
    [ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
    nvm install 18 || nvm install 20 || nvm install --lts
    nvm alias default 18
    log "Node.js $(node --version) installed via nvm."
    return 0
  fi

  case "$PKG_MANAGER" in
    apt)
      # Use NodeSource for a recent Node 18+ on Debian/Ubuntu
      if ! command -v curl &>/dev/null; then
        $INSTALL_CMD curl
      fi
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
      $INSTALL_CMD nodejs
      ;;
    dnf)
      if command -v dnf module &>/dev/null; then
        sudo dnf module install -y nodejs:20
      else
        $INSTALL_CMD nodejs
      fi
      ;;
    yum)
      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
      $INSTALL_CMD nodejs
      ;;
    pacman)
      $INSTALL_CMD nodejs npm
      ;;
    zypper)
      $INSTALL_CMD nodejs20 nodejs20-npm
      ;;
    brew)
      $INSTALL_CMD node
      ;;
    *)
      warn "Could not auto-install Node.js. Please install Node.js 18+ manually."
      return 1
      ;;
  esac

  log "Node.js $(node --version) and npm $(npm --version) installed."
}

install_npm_deps() {
  info "Installing npm dependencies…"
  npm install --no-audit --no-fund
  log "Dependencies installed."
}

build_project() {
  info "Building BeaconOS…"
  npm run build
  log "Build complete."
}

link_binary() {
  # Register the `beaconos` command globally via npm link
  if command -v beaconos &>/dev/null; then
    log "beaconos is already linked ($(which beaconos))."
    return 0
  fi

  info "Linking beaconos command globally…"

  # Try plain npm link first; fall back to sudo if it fails (permissions)
  if npm link 2>/dev/null; then
    :  # success
  elif command -v sudo &>/dev/null; then
    warn "npm link failed — retrying with sudo (this may prompt for your password)."
    sudo npm link
  else
    warn "npm link failed. Falling back to manual symlink…"
    local npm_bin
    npm_bin="$(npm bin -g 2>/dev/null || echo /usr/local/bin)"
    sudo ln -sf "$PWD/dist/index.js" "$npm_bin/beaconos" 2>/dev/null || \
      ln -sf "$PWD/dist/index.js" "$HOME/.local/bin/beaconos" 2>/dev/null || {
        warn "Could not create symlink. Please run manually:"
        echo "  sudo npm link"
        return 1
      }
  fi

  log "beaconos is now available as a global command."

  # Defensive check
  if ! command -v beaconos &>/dev/null; then
    warn "beaconos still isn't on PATH after linking."
    warn "Check that your npm global bin directory is in PATH:"
    warn "  npm bin -g   →   $(npm bin -g)"
    warn "Add it to your ~/.bashrc or ~/.zshrc if needed:"
    warn "  export PATH=\"\$(npm bin -g):\$PATH\""
  fi
}

clone_if_needed() {
  # If we're already in a BeaconOS directory with package.json, skip cloning
  if [ -f "package.json" ] && grep -q '"beaconos"' package.json 2>/dev/null; then
    log "Already inside BeaconOS repository."
    return 0
  fi

  if [ ! -d BeaconOS ]; then
    info "Cloning BeaconOS repository…"
    git clone https://github.com/CrossbowCraft13/BeaconOS.git
  fi
  cd BeaconOS
}

# ─── Main ─────────────────────────────────────────────────────────────────
main() {
  echo ""
  echo -e "${BOLD}BeaconOS — Bootstrap Installer${NC}"
  echo ""

  detect_pkg_manager

  # If we have a known package manager, fetch metadata first (quietly)
  if [ -n "$PKG_MANAGER" ] && [ "$PKG_MANAGER" = "apt" ]; then
    info "Updating package index…"
    sudo $UPDATE_CMD || true
  fi

  install_git
  install_node
  clone_if_needed
  install_npm_deps
  build_project
  link_binary

  echo ""
  log "${BOLD}BeaconOS v1.0.0 is ready.${NC}"
  echo ""
  info "Try these commands:"
  echo "  beaconos help"
  echo "  beaconos dashboard"
  echo "  beaconos create MyServer"
  echo ""
}

main "$@"
