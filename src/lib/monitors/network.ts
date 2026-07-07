/**
 * NetworkMonitor — measures active network interfaces.
 *
 * Uses os.networkInterfaces() to count active (non-internal)
 * interfaces. This provides a baseline that can be expanded
 * with bandwidth monitoring in future PRs.
 */

import * as os from "os";

export interface NetworkSample {
  interfaces: number;
}

export class NetworkMonitor {
  /**
   * Sample active network interfaces.
   * Returns the count of non-internal interfaces.
   */
  sample(): NetworkSample {
    const interfaces = os.networkInterfaces();
    let activeCount = 0;

    for (const name of Object.keys(interfaces)) {
      const addrs = interfaces[name];
      if (!addrs) continue;

      // Count if it has any non-internal address
      const hasExternal = addrs.some(
        (addr) => !addr.internal && addr.family === "IPv4",
      );
      if (hasExternal) activeCount++;
    }

    return { interfaces: activeCount };
  }
}
