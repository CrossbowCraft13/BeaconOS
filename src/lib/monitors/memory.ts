/**
 * MemoryMonitor — measures system memory usage.
 *
 * Uses os.totalmem() and os.freemem() for current RAM stats.
 * Returns values in bytes for the API to format as needed.
 */

import * as os from "os";

export interface MemorySample {
  total: number;
  free: number;
  used: number;
}

export class MemoryMonitor {
  /**
   * Sample current memory usage. Returns bytes.
   */
  sample(): MemorySample {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    return { total, free, used };
  }
}
