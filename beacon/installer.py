"""
BeaconOS — System installer.

Checks for prerequisites (git, Node.js, npm), installs them via the
system package manager when needed, builds the TypeScript project,
and registers the ``beaconos`` CLI command globally.
"""

import os
import platform
import shutil
import stat
import subprocess
import sys
from pathlib import Path

from .utils import success, warning, error


REPO_DIR = Path(__file__).resolve().parent.parent  # root of the BeaconOS repo


# ── Helpers ────────────────────────────────────────────────────────────────


def _run(*args, cwd=None, capture=False):
    """Run a command and return (returncode, stdout, stderr)."""
    kwargs = {"cwd": cwd or str(REPO_DIR)}
    if capture:
        kwargs["stdout"] = subprocess.PIPE
        kwargs["stderr"] = subprocess.PIPE
    result = subprocess.run(list(args), **kwargs)
    return result.returncode, result.stdout, result.stderr


def _has_command(name):
    return shutil.which(name) is not None


def _sudo(cmd):
    """Prepend sudo if we're not already root."""
    if os.geteuid() == 0:
        return cmd
    return ["sudo"] + cmd


def _package_manager():
    """Detect the system package manager.  Returns (name, install_cmd)."""
    os_name = platform.system()

    if os_name == "Linux":
        for pm, cmd in [
            ("apt-get", ["apt-get", "install", "-y", "-qq"]),
            ("dnf", ["dnf", "install", "-y"]),
            ("yum", ["yum", "install", "-y"]),
            ("pacman", ["pacman", "-S", "--noconfirm"]),
            ("zypper", ["zypper", "install", "-y"]),
        ]:
            if shutil.which(pm):
                return pm, cmd
    elif os_name == "Darwin":
        if shutil.which("brew"):
            return "brew", ["brew", "install"]

    return None, None


# ── Install steps ──────────────────────────────────────────────────────────


def install_git():
    """Install git if not already present."""
    if _has_command("git"):
        success(f"Git already installed ({shutil.which('git')}).")
        return True

    pm_name, pm_cmd = _package_manager()
    if not pm_name:
        error("No supported package manager found. Please install git manually.")
        return False

    warning("git not found — installing…")
    try:
        subprocess.check_call(_sudo(pm_cmd + ["git"]))
        success("git installed.")
        return True
    except subprocess.CalledProcessError:
        error("Failed to install git.")
        return False


def install_node():
    """Install Node.js 18+ and npm if not already present."""
    if _has_command("node"):
        try:
            ver = subprocess.check_output(
                ["node", "--version"], text=True
            ).strip()
            major = int(ver.lstrip("v").split(".")[0])
            if major >= 18:
                success(f"Node.js {ver} detected.")
                return True
            warning(f"Node.js {ver} is too old — upgrading to 20 LTS…")
        except (ValueError, subprocess.CalledProcessError):
            warning("Could not determine Node.js version — will re-install.")

    pm_name, pm_cmd = _package_manager()
    if not pm_name:
        error("No supported package manager found. Please install Node.js 18+ manually.")
        return False

    info("Installing Node.js 18+ and npm…")

    try:
        # Platform-specific approach for the latest LTS
        if pm_name in ("apt-get",):
            # NodeSource setup for Debian/Ubuntu
            if not _has_command("curl"):
                subprocess.check_call(_sudo(pm_cmd + ["curl"]))
            subprocess.check_call(
                ["curl", "-fsSL", "https://deb.nodesource.com/setup_20.x"],
                stdout=subprocess.DEVNULL,
            )
            subprocess.check_call(_sudo(pm_cmd + ["nodejs"]))
        elif pm_name in ("dnf",):
            rc, _, _ = _run("dnf", "module", "install", "-y", "nodejs:20")
            if rc != 0:
                subprocess.check_call(_sudo(pm_cmd + ["nodejs"]))
        elif pm_name == "yum":
            subprocess.check_call(
                ["curl", "-fsSL", "https://rpm.nodesource.com/setup_20.x"],
                stdout=subprocess.DEVNULL,
            )
            subprocess.check_call(_sudo(pm_cmd + ["nodejs"]))
        elif pm_name == "pacman":
            subprocess.check_call(_sudo(pm_cmd + ["nodejs", "npm"]))
        elif pm_name == "zypper":
            subprocess.check_call(_sudo(pm_cmd + ["nodejs20", "nodejs20-npm"]))
        else:
            subprocess.check_call(_sudo(pm_cmd + ["node"]))

        success(f"Node.js {subprocess.check_output(['node', '--version'], text=True).strip()} installed.")
        return True
    except subprocess.CalledProcessError:
        error("Failed to install Node.js.")
        return False


def install_npm_deps():
    """Run npm install inside the repo."""
    info("Installing npm dependencies…")
    rc, _, err = _run("npm", "install", "--no-audit", "--no-fund")
    if rc != 0:
        error(f"npm install failed:\n{err.decode() if err else ''}")
        return False
    success("Dependencies installed.")
    return True


def build_project():
    """Compile TypeScript → dist/."""
    info("Building BeaconOS…")
    rc, _, err = _run("npm", "run", "build")
    if rc != 0:
        error(f"Build failed:\n{err.decode() if err else ''}")
        return False
    success("Build complete.")
    return True


def link_binary():
    """Register the ``beaconos`` command globally via npm link."""
    if _has_command("beaconos"):
        success(f"beaconos is already linked ({shutil.which('beaconos')}).")
        return True

    info("Linking beaconos command globally…")

    # Try plain npm link
    rc, _, err = _run("npm", "link")
    if rc == 0 and _has_command("beaconos"):
        success("beaconos is now available as a global command.")
        return True

    # If npm link failed (likely permissions), try with sudo
    if _has_command("sudo") and not (os.geteuid() == 0):
        warning("npm link failed — retrying with sudo…")
        try:
            subprocess.check_call(
                ["sudo", "npm", "link"], cwd=str(REPO_DIR)
            )
            success("beaconos is now available as a global command.")
            return True
        except subprocess.CalledProcessError:
            pass

    # Last resort: manual symlink
    warning("Falling back to manual symlink…")
    try:
        bin_dir = subprocess.check_output(
            ["npm", "bin", "-g"], text=True
        ).strip()
    except Exception:
        bin_dir = "/usr/local/bin"

    target = Path(bin_dir) / "beaconos"
    source = REPO_DIR / "dist" / "index.js"

    if not source.exists():
        error(f"Built binary not found at {source}. Did the build step run?")
        return False

    try:
        target.symlink_to(str(source))
        target.chmod(target.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        success(f"beaconos linked at {target}.")
        return True
    except PermissionError:
        # Last try with sudo
        try:
            subprocess.check_call(_sudo(["ln", "-sf", str(source), str(target)]))
            success(f"beaconos linked at {target}.")
            return True
        except subprocess.CalledProcessError:
            error("Could not link beaconos. Please run manually:")
            print("  sudo npm link")
            return False


def info(msg):
    """Print an informational line (same style as utils helpers)."""
    from rich.console import Console
    Console().print(f"[cyan]→[/cyan] {msg}")


# ── Public API ─────────────────────────────────────────────────────────────


def run_checks():
    """
    Full install workflow — called from the interactive menu and from
    ``python -m beacon``.
    """
    success("Running installation checks…")

    os_name = platform.system()
    if os_name == "Linux":
        success("Linux detected.")
    elif os_name == "Windows":
        warning("Windows support is experimental.")
    else:
        warning(f"{os_name} has not been tested.")

    # ── Prerequisites ─────────────────────────────────────────────────
    if not install_git():
        return False
    if not install_node():
        return False

    # ── Build & link ──────────────────────────────────────────────────
    if not install_npm_deps():
        return False
    if not build_project():
        return False
    if not link_binary():
        return False

    success("Installation complete!")
    print()
    info("Try these commands:")
    print("  beaconos help")
    print("  beaconos dashboard")
    print("  beaconos create MyServer")
    print()
    return True


if __name__ == "__main__":  # pragma: no cover
    run_checks()
