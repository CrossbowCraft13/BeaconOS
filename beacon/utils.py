from rich.console import Console

console = Console()


def success(message):
    console.print(f"[green]✔[/green] {message}")


def warning(message):
    console.print(f"[yellow]![/yellow] {message}")


def error(message):
    console.print(f"[red]✖[/red] {message}")
