#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────
#  BeaconOS — Uninstaller
#  Removes the beaconos CLI, its installed dependencies
#  (in the repo), and the configuration directory.
#  Does NOT remove git or Node.js — they may be needed by
#  other software.
# ──────────────────────────────────────────────────────────

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
NC="\033[0m"

log()  { echo -e "${GREEN}✔${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✖${NC} $1"; }
info() { echo -e "${CYAN}→${NC} $1"; }

# ── Locate the installation ────────────────────────────────────────────────

# Resolve where the beaconos command points to, so we can get back to the
# repo directory even if the user is running uninstall.sh from elsewhere.
resolve_repo_dir() {
  local cmd_path
  cmd_path="$(command -v beaconos 2>/dev/null || true)"
  if [ -n "$cmd_path" ]; then
    # Resolve symlinks to get the real dist/index.js path
    local real_path
    real_path="$(readlink -f "$cmd_path" 2>/dev/null || echo "$cmd_path")"
    local dir
    dir="$(dirname "$real_path" 2>/dev/null)"
    # dist/index.js → dist/ → repo root
    if [[ "$dir" == */dist ]]; then
      echo "${dir%/dist}"
      return 0
    fi
  fi
  # Fallback: check common locations
  for d in "$PWD" "$HOME/BeaconOS" /usr/local/lib/node_modules/beaconos; do
    if [ -f "$d/package.json" ] && grep -q '"beaconos"' "$d/package.json" 2>/dev/null; then
      echo "$d"
      return 0
    fi
  done
  echo ""
}

# ── Removal steps ──────────────────────────────────────────────────────────

unlink_binary() {
  if ! command -v beaconos &>/dev/null; then
    log "beaconos command not found on PATH — nothing to unlink."
    return 0
  fi

  info "Removing global beaconos command…"

  # Strategy 1: npm unlink (handles nvm / user-level prefixes)
  if npm unlink -g beaconos &>/dev/null; then
    log "beaconos unlinked via npm."
    return 0
  fi

  # Strategy 2: sudo npm unlink (if passwordless or when run with sudo)
  if command -v sudo &>/dev/null && (sudo -n true 2>/dev/null || [ "$(id -u)" -eq 0 ]); then
    if sudo npm unlink -g beaconos &>/dev/null; then
      log "beaconos unlinked via sudo npm."
      return 0
    fi
  fi

  # Strategy 3: remove symlinks directly
  local removed=false
  local paths
  paths="$(command -v beaconos 2>/dev/null || true)
$(npm bin -g 2>/dev/null || echo /usr/local/bin)/beaconos
$HOME/.local/bin/beaconos
/usr/local/bin/beaconos
/usr/bin/beaconos"

  while IFS= read -r p; do
    if [ -L "$p" ] || [ -f "$p" ]; then
      if rm -f "$p" 2>/dev/null; then
        log "Removed $p"
        removed=true
      elif command -v sudo &>/dev/null; then
        sudo rm -f "$p" 2>/dev/null && log "Removed $p (sudo)" && removed=true || true
      fi
    fi
  done <<< "$paths"

  if [ "$removed" = true ]; then
    return 0
  fi

  warn "Could not automatically remove the beaconos command."
  warn "Try running:  sudo npm unlink -g beaconos"
  return 1
}

remove_repo() {
  local repo_dir="$1"
  if [ ! -d "$repo_dir" ]; then
    return 0
  fi

  # Check if there are user-created servers inside the repo (they'd be lost)
  local has_servers=false
  if ls "$repo_dir"/**/server.properties &>/dev/null 2>&1; then
    has_servers=true
  fi

  info "Removing BeaconOS installation at ${repo_dir}…"
  rm -rf "$repo_dir" 2>/dev/null && { log "Removed ${repo_dir}."; return 0; }

  # If plain rm failed (permissions), try sudo
  if command -v sudo &>/dev/null; then
    sudo rm -rf "$repo_dir" 2>/dev/null && { log "Removed ${repo_dir}."; return 0; }
  fi

  warn "Could not remove ${repo_dir}. Please delete it manually."
  return 1
}

remove_config() {
  local config_dir="$HOME/.beaconos"
  if [ ! -d "$config_dir" ]; then
    return 0
  fi

  info "Removing configuration at ${config_dir}…"
  rm -rf "$config_dir" 2>/dev/null && { log "Removed ${config_dir}."; return 0; }

  warn "Could not remove ${config_dir}. Please delete it manually."
  return 1
}

remove_npm_package() {
  # Remove the globally installed npm package if present (separate from npm link)
  local global_dir
  global_dir="$(npm root -g 2>/dev/null || echo "")"
  if [ -n "$global_dir" ] && [ -d "$global_dir/beaconos" ]; then
    info "Removing global npm package…"
    if npm uninstall -g beaconos &>/dev/null; then
      log "Global npm package removed."
    elif command -v sudo &>/dev/null && (sudo -n true 2>/dev/null || [ "$(id -u)" -eq 0 ]); then
      sudo npm uninstall -g beaconos &>/dev/null && log "Global npm package removed." || true
    fi
  fi
}

# ── Main ───────────────────────────────────────────────────────────────────

main() {
  echo ""
  echo -e "${BOLD}BeaconOS — Uninstaller${NC}"
  echo ""

  if ! command -v npm &>/dev/null; then
    warn "npm not found — BeaconOS may not be installed at all."
  fi

  # Figure out where BeaconOS is installed
  local repo_dir
  repo_dir="$(resolve_repo_dir)"
  local found_repo=false
  if [ -n "$repo_dir" ] && [ -d "$repo_dir" ]; then
    found_repo=true
  fi

  # Optional: also scan the parent of the current dir or common locations
  if [ "$found_repo" = false ]; then
    for candidate in "$PWD" "$HOME/BeaconOS" /usr/local/lib/node_modules/beaconos; do
      if [ -f "$candidate/package.json" ] && grep -q '"beaconos"' "$candidate/package.json" 2>/dev/null; then
        repo_dir="$candidate"
        found_repo=true
        break
      fi
    done
  fi

  # ── Confirm ─────────────────────────────────────────────────────────
  echo -e "${YELLOW}This will:${NC}"
  if command -v beaconos &>/dev/null; then
    echo "  • Remove the beaconos command"
  fi
  if [ "$found_repo" = true ]; then
    echo "  • Delete the BeaconOS installation at: ${repo_dir}"
  fi
  if [ -d "$HOME/.beaconos" ]; then
    echo "  • Delete the configuration directory (~/.beaconos)"
  fi
  echo "  • Leave git and Node.js untouched"
  echo "  • Leave your Minecraft servers untouched"
  echo ""

  if [ -t 0 ]; then
    # Interactive terminal — ask for confirmation
    read -r -p "Uninstall BeaconOS? [y/N] " response
    case "$response" in
      [yY][eE][sS]|[yY]) ;;
      *) echo "Aborted."; exit 0 ;;
    esac
  fi

  # ── Execute ─────────────────────────────────────────────────────────
  remove_npm_package
  unlink_binary

  if [ "$found_repo" = true ]; then
    remove_repo "$repo_dir"
  else
    warn "BeaconOS repo directory not found — skipping."
  fi

  remove_config

  # ── Done ────────────────────────────────────────────────────────────
  echo ""
  log "${BOLD}BeaconOS has been uninstalled.${NC}"
  echo ""
  info "What's left behind (safe to keep):"
  echo "  • git — $(git --version 2>/dev/null || echo 'removed before uninstall')"
  echo "  • Node.js — $(node --version 2>/dev/null || echo 'removed before uninstall')"
  echo "  • npm — $(npm --version 2>/dev/null || echo 'removed before uninstall')"
  echo "  • Your Minecraft servers (if any)"
  echo ""
  info "To remove those too, use your system package manager."
  echo ""
}

main "$@"
