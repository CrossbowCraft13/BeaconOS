import platform

from .utils import success, warning


def run_checks():

    success("Running installation checks...")

    os_name = platform.system()

    if os_name == "Linux":
        success("Linux detected.")

    elif os_name == "Windows":
        warning("Windows support is experimental.")

    else:
        warning(f"{os_name} has not been tested.")

    success("Installation checks complete.")
