from rich.console import Console
from rich.panel import Panel

from .menu import main_menu
from .installer import run_checks

console = Console()


def start():

    console.print()

    console.print(
        Panel.fit(
            "[bold cyan]BeaconOS[/bold cyan]\n"
            "Version 0.1 Alpha",
            title="Welcome"
        )
    )

    while True:

        choice = main_menu()

        if choice == "Install Server":
            run_checks()

        elif choice == "Manage Server":
            console.print("[yellow]Coming Soon[/yellow]")

        elif choice == "Backups":
            console.print("[yellow]Coming Soon[/yellow]")

        elif choice == "Settings":
            console.print("[yellow]Coming Soon[/yellow]")

        elif choice == "Exit":
            console.print("\nGoodbye!\n")
            break
