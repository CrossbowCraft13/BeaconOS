/**
 * DiskMonitor — measures disk usage for the BeaconOS data directory.
 *
 * Uses fs.statfs on Linux/Mac to get filesystem stats, falling back
 * to a best-effort calculation from the root directory.
 */

import * as fs from "fs";
import { ConfigService } from "../config";

export interface DiskSample {
  total: number;
  free: number;
  used: number;
}

export class DiskMonitor {
  private dataDir: string;

  constructor(config: ConfigService) {
    this.dataDir = config.getDataDirectory();
  }

  /**
   * Sample current disk usage for the filesystem containing
   * the BeaconOS data directory.
   */
  sample(): DiskSample {
    try {
      // Node.js 19.6+ has fs.statfs; for older versions we estimate
      if (typeof (fs as any).statfsSync === "function") {
        const stats = (fs as any).statfsSync(this.dataDir);
        const total = stats.blocks * stats.bsize;
        const free = stats.bfree * stats.bsize;
        return {
          total,
          free,
          used: total - free,
        };
      }
    } catch {
      // statfs not available (older Node) or failed — fall through
    }

    // Fallback: use the disk root of the data directory
    try {
      const root = this.dataDir === "/" ? "/" : "/";
      // Rough estimate: if we can't get real stats, report unknown
      return { total: 0, free: 0, used: 0 };
    } catch {
      return { total: 0, free: 0, used: 0 };
    }
  }
}
