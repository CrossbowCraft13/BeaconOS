<img width="2554" height="1265" alt="BeaconOS Social Preview" src="https://github.com/user-attachments/assets/a8895da0-934d-4ac2-bcbe-8a87a1ab1a42" />


# BeaconOS

A modern command-line toolkit for creating and managing Minecraft server projects.

> **Current Release:** v0.5.0 Beta

---

## About

BeaconOS is an open-source project focused on simplifying Minecraft server management.

The long-term goal is to provide an easy-to-use operating system and toolkit capable of:

- Creating Minecraft server projects
- Managing multiple servers
- Installing plugins and packages
- Monitoring server status
- Providing a web dashboard
- Becoming a complete server management platform

---

## Features

### v0.5.0 Beta

- **Web Dashboard** — start a built-in HTTP dashboard to view system status and server projects
- All features from v0.4.0 Alpha

### v0.4.0 Alpha

- Create new BeaconOS server projects
- Automatically generate project folders
- Generate a default configuration
- Generate a project README
- Modular command architecture
- Version and Help commands
- Check server project status
- **Package Manager** — install, remove, list, and search Minecraft plugins
- Curated registry of 25+ well-known plugins
- Direct URL installation support

---

## Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/BeaconOS.git
```

Install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

---

## Usage

Display help:

```bash
node dist/index.js help
```

Display version:

```bash
node dist/index.js version
```

Check a server project:

```bash
node dist/index.js status MyServer
```

Create a new server:

```bash
node dist/index.js create MyServer
```

Manage packages:

```bash
node dist/index.js packages list MyServer
node dist/index.js packages search world
node dist/index.js packages install MyServer luckperms
node dist/index.js packages remove MyServer luckperms
```

Start the Web Dashboard:

```bash
node dist/index.js dashboard
```

Optional: specify a custom port:

```bash
node dist/index.js dashboard 8080
```

---

## Example Output

```
Creating BeaconOS server...

✓ Folder created
✓ Configuration written
✓ README generated
✓ Server ready!
```

Generated project:

```
MyServer/
├── beacon.yml
├── README.md
├── plugins/
├── worlds/
├── logs/
├── config/
└── cache/
```

---

## Project Structure

```
BeaconOS/
├── src/
│   ├── commands/
│   │   ├── create.ts
│   │   ├── dashboard.ts
│   │   ├── help.ts
│   │   ├── init.ts
│   │   ├── packages.ts
│   │   ├── status.ts
│   │   └── version.ts
│   ├── dashboard/
│   │   └── index.html
│   ├── lib/
│   │   ├── constants.ts
│   │   ├── dashboard-server.ts
│   │   ├── filesystem.ts
│   │   ├── logger.ts
│   │   ├── package-manager.ts
│   │   ├── registry.ts
│   │   └── templates.ts
│   ├── types/
│   │   └── config.ts
│   └── index.ts
├── beacon/
│   ├── cli.py
│   ├── config.py
│   ├── init.py
│   ├── installer.py
│   ├── menu.py
│   └── utils.py
├── package.json
├── tsconfig.json
└── README.md
```

---

## Roadmap

| Version | Milestone |
|---------|-----------|
| ✅ v0.1 Alpha | CLI Foundation |
| ✅ v0.2 Alpha | Server Creation |
| ✅ v0.3 Alpha | Server Management |
| ✅ v0.4 Alpha | Package Manager |
| ✅ v0.5 Beta | Web Dashboard |
| ⏳ v1.0 Stable | Production Release |

---

## Technologies

- TypeScript
- Node.js
- npm

---

## Contributing

BeaconOS is currently in active alpha development.

Bug reports, feature suggestions, and pull requests are welcome.

---

## License

MIT License

---

Built with ❤️ using TypeScript.
