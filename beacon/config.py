from pathlib import Path
import yaml

CONFIG_DIR = Path.home() / ".beaconos"
CONFIG_FILE = CONFIG_DIR / "config.yml"


def initialize():
    """Create configuration directory and file if missing."""
    CONFIG_DIR.mkdir(exist_ok=True)

    if not CONFIG_FILE.exists():
        default = {
            "server_directory": str(Path.home() / "BeaconServers"),
            "default_ram": "4G",
            "theme": "default"
        }

        with open(CONFIG_FILE, "w") as file:
            yaml.dump(default, file)


def load():
    with open(CONFIG_FILE) as file:
        return yaml.safe_load(file)
