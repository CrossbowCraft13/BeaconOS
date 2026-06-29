import questionary


def main_menu():

    return questionary.select(
        "Choose an option:",
        choices=[
            "Install Server",
            "Manage Server",
            "Backups",
            "Settings",
            "Exit"
        ]
    ).ask()
