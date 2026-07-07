/**
 * Curated package registry for BeaconOS.
 *
 * Each entry represents a well-known Minecraft plugin or server tool.
 * Where available, `url` provides a direct download link; otherwise
 * `homepage` points users to the official source.
 */

export interface PackageEntry {
  /** Unique identifier (lowercase, kebab-case) */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Short description */
  description: string;
  /** Author / organisation */
  author: string;
  /** Category grouping */
  category: PackageCategory;
  /** Direct download URL (.jar), when known */
  url?: string;
  /** Project home page / documentation */
  homepage?: string;
  /** Spigot resource ID (for Spiget API lookups) */
  spigotId?: number;
}

export type PackageCategory =
  | "server-software"
  | "core"
  | "permissions"
  | "world"
  | "economy"
  | "chat"
  | "admin"
  | "minigame"
  | "developer-tools"
  | "performance"
  | "anticheat"
  | "misc";

const REGISTRY: PackageEntry[] = [
  // ── Server Software ────────────────────────────────────────────
  {
    name: "paper",
    displayName: "Paper",
    description: "High-performance fork of Spigot with improved mechanics, optimisations, and a plugin API.",
    author: "PaperMC",
    category: "server-software",
    url: "https://api.papermc.io/v2/projects/paper/versions/1.21.4/builds/latest/downloads/paper-1.21.4-latest.jar",
    homepage: "https://papermc.io",
  },
  {
    name: "purpur",
    displayName: "Purpur",
    description: "Fork of Paper with a focus on configurability and creative server features.",
    author: "PurpurMC",
    category: "server-software",
    homepage: "https://purpurmc.org",
  },
  {
    name: "velocity",
    displayName: "Velocity",
    description: "Modern proxy server for Minecraft, compatible with Paper and Spigot backends.",
    author: "PaperMC",
    category: "server-software",
    url: "https://api.papermc.io/v2/projects/velocity/versions/latest/builds/latest/downloads/velocity-latest.jar",
    homepage: "https://papermc.io/software/velocity",
  },

  // ── Core / Essentials ──────────────────────────────────────────
  {
    name: "essentialsx",
    displayName: "EssentialsX",
    description: "Essential server commands — teleportation, warps, kits, homes, and more.",
    author: "EssentialsX Team",
    category: "core",
    homepage: "https://essentialsx.net",
    spigotId: 9089,
  },
  {
    name: "cmi",
    displayName: "CMI",
    description: "All-in-one plugin suite providing homes, warps, kits, economy and 250+ commands.",
    author: "Zrips",
    category: "core",
    homepage: "https://www.zrips.net/cmi",
    spigotId: 3742,
  },

  // ── Permissions ────────────────────────────────────────────────
  {
    name: "luckperms",
    displayName: "LuckPerms",
    description: "High-performance permissions system supporting multiple storage backends.",
    author: "Luck",
    category: "permissions",
    url: "https://download.luckperms.net/latest/bukkit/loader/LuckPerms-Bukkit-loader-latest.jar",
    homepage: "https://luckperms.net",
  },

  // ── World / Mapping ────────────────────────────────────────────
  {
    name: "worldedit",
    displayName: "WorldEdit",
    description: "In-game world editor for building, terraforming, and block manipulation.",
    author: "EngineHub",
    category: "world",
    homepage: "https://enginehub.org/worldedit",
    spigotId: 572,
  },
  {
    name: "worldguard",
    displayName: "WorldGuard",
    description: "Region-based protection and flag system for claims and spawn areas.",
    author: "EngineHub",
    category: "world",
    homepage: "https://enginehub.org/worldguard",
    spigotId: 573,
  },
  {
    name: "fastasyncworldedit",
    displayName: "FastAsyncWorldEdit",
    description: "Multithreaded fork of WorldEdit designed for large-scale operations on busy servers.",
    author: "IntellectualSites",
    category: "world",
    homepage: "https://intellectualsites.com/fastasyncworldedit",
    spigotId: 13932,
  },
  {
    name: "multiverse-core",
    displayName: "Multiverse-Core",
    description: "Multi-world management plugin — create, import, and teleport between worlds.",
    author: "Multiverse",
    category: "world",
    homepage: "https://github.com/Multiverse/Multiverse-Core",
    spigotId: 390,
  },
  {
    name: "dynmap",
    displayName: "Dynmap",
    description: "Real-time web-based map of your Minecraft server world.",
    author: "webbukkit",
    category: "world",
    homepage: "https://github.com/webbukkit/Dynmap",
    spigotId: 274,
  },

  // ── Economy ────────────────────────────────────────────────────
  {
    name: "vault",
    displayName: "Vault",
    description: "Economy and permissions abstraction layer for plugins to interface with providers.",
    author: "MilkBowl",
    category: "economy",
    homepage: "https://github.com/MilkBowl/Vault",
    spigotId: 3431,
  },
  {
    name: "essentialsx-economy",
    displayName: "EssentialsX Economy",
    description: "Economy module of EssentialsX — adds currency, balances, and payments.",
    author: "EssentialsX Team",
    category: "economy",
    homepage: "https://essentialsx.net",
  },

  // ── Chat ───────────────────────────────────────────────────────
  {
    name: "venturechat",
    displayName: "VentureChat",
    description: "Advanced chat channels, formats, and messaging for modern Minecraft servers.",
    author: "austinv11",
    category: "chat",
    homepage: "https://github.com/austinv11/VentureChat",
    spigotId: 11592,
  },

  // ── Admin / Moderation ─────────────────────────────────────────
  {
    name: "coreprotect",
    displayName: "CoreProtect",
    description: "Block and transaction logging for rollback and grief prevention.",
    author: "PlayPro",
    category: "admin",
    homepage: "https://coreprotect.net",
    spigotId: 8631,
  },
  {
    name: "litematica",
    displayName: "Litematica",
    description: "Client-side schematic tool for easy building with structure templates.",
    author: "maruohon",
    category: "admin",
    homepage: "https://www.curseforge.com/minecraft/mc-mods/litematica",
  },
  {
    name: "commandbook",
    displayName: "CommandBook",
    description: "Essential commands for moderation — teleport, vanish, god mode, and more.",
    author: "EngineHub",
    category: "admin",
    homepage: "https://enginehub.org/commandbook",
    spigotId: 565,
  },

  // ── Performance ────────────────────────────────────────────────
  {
    name: "spark",
    displayName: "spark",
    description: "Performance profiler for Minecraft servers — CPU, memory, and tick profiling.",
    author: "Luck",
    category: "performance",
    homepage: "https://spark.lucko.me",
  },
  {
    name: "chunky",
    displayName: "Chunky",
    description: "Pre-generates chunks for world borders to improve performance during exploration.",
    author: "pop4959",
    category: "performance",
    homepage: "https://github.com/pop4959/Chunky",
    spigotId: 81534,
  },

  // ── Anti-Cheat ─────────────────────────────────────────────────
  {
    name: "matrix",
    displayName: "Matrix",
    description: "Advanced anti-cheat system with machine-learning and behavioural detection.",
    author: "MWHunter",
    category: "anticheat",
    homepage: "https://matrix.rip",
    spigotId: 64635,
  },
  {
    name: "griefprevention",
    displayName: "GriefPrevention",
    description: "Claim-based land protection with intuitive tools for players and admins.",
    author: "BigScary",
    category: "anticheat",
    homepage: "https://www.spigotmc.org/resources/griefprevention.1884/",
    spigotId: 1884,
  },

  // ── Developer Tools ────────────────────────────────────────────
  {
    name: "placeholderapi",
    displayName: "PlaceholderAPI",
    description: "Expands placeholder strings from hundreds of plugins into dynamic values.",
    author: "PlaceholderAPI Team",
    category: "developer-tools",
    homepage: "https://github.com/PlaceholderAPI/PlaceholderAPI",
    spigotId: 6245,
  },
  {
    name: "protocollib",
    displayName: "ProtocolLib",
    description: "Library that reads and modifies the Minecraft protocol for packet-based plugins.",
    author: "dmulloy2",
    category: "developer-tools",
    homepage: "https://github.com/dmulloy2/ProtocolLib",
    spigotId: 1997,
  },
  {
    name: "skript",
    displayName: "Skript",
    description: "Scriptable plugin allowing server admins to create custom gameplay mechanics.",
    author: "SkriptLang",
    category: "developer-tools",
    homepage: "https://skriptlang.github.io/Skript",
    spigotId: 114771,
  },
  {
    name: "commandapi",
    displayName: "CommandAPI",
    description: "Developer library for creating powerful Minecraft commands with Brigadier.",
    author: "Jorel",
    category: "developer-tools",
    homepage: "https://commandapi.jorel.dev",
    spigotId: 62353,
  },

  // ── Misc ───────────────────────────────────────────────────────
  {
    name: "geyser",
    displayName: "Geyser",
    description: "Allows Bedrock Edition players to connect to Java Edition servers.",
    author: "GeyserMC",
    category: "misc",
    homepage: "https://geysermc.org",
  },
  {
    name: "floodgate",
    displayName: "Floodgate",
    description: "Enables Bedrock clients to join without a Java Edition account when using Geyser.",
    author: "GeyserMC",
    category: "misc",
    homepage: "https://github.com/GeyserMC/Floodgate",
  },
  {
    name: "viaversion",
    displayName: "ViaVersion",
    description: "Allows clients on different Minecraft versions to connect to your server.",
    author: "ViaVersion",
    category: "misc",
    homepage: "https://viaversion.com",
    spigotId: 19254,
  },
  {
    name: "discordsrv",
    displayName: "DiscordSRV",
    description: "Links your Minecraft server to a Discord channel via chat and events.",
    author: "DiscordSRV Team",
    category: "misc",
    homepage: "https://discordsrv.com",
    spigotId: 18494,
  },
  {
    name: "blueprint",
    displayName: "BluePrint",
    description: "Kotlin-based plugin framework for modern Minecraft server development.",
    author: "BluePrint Team",
    category: "misc",
    homepage: "https://github.com/BluePrint-Project/BluePrint",
  },
];

// ── Lookup helpers ───────────────────────────────────────────────

export function getAllPackages(): PackageEntry[] {
  return REGISTRY;
}

export function getPackageByName(name: string): PackageEntry | undefined {
  return REGISTRY.find(
    (p) => p.name === name || p.displayName.toLowerCase() === name.toLowerCase(),
  );
}

export function searchPackages(query: string): PackageEntry[] {
  const q = query.toLowerCase();
  return REGISTRY.filter(
    (p) =>
      p.name.includes(q) ||
      p.displayName.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.includes(q) ||
      p.author.toLowerCase().includes(q),
  );
}

export function getPackagesByCategory(category: PackageCategory): PackageEntry[] {
  return REGISTRY.filter((p) => p.category === category);
}

export function getCategories(): PackageCategory[] {
  return [
    "server-software",
    "core",
    "permissions",
    "world",
    "economy",
    "chat",
    "admin",
    "performance",
    "anticheat",
    "developer-tools",
    "misc",
  ];
}

export function formatCategory(cat: PackageCategory): string {
  const labels: Record<PackageCategory, string> = {
    "server-software": "Server Software",
    core: "Core / Essentials",
    permissions: "Permissions",
    world: "World / Mapping",
    economy: "Economy",
    chat: "Chat",
    admin: "Admin / Moderation",
    "developer-tools": "Developer Tools",
    performance: "Performance",
    anticheat: "Anti-Cheat",
    minigame: "Minigame",
    misc: "Miscellaneous",
  };
  return labels[cat] ?? cat;
}
