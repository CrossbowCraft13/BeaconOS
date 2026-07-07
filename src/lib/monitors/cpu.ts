/**
 * CpuMonitor — measures system CPU usage as a percentage (0-100).
 *
 * Uses os.cpus() to measure idle vs total time deltas between samples,
 * which gives an accurate CPU usage percentage across all cores.
 */

import * as os from "os";

interface CpuTimes {
  idle: number;
  total: number;
}

export class CpuMonitor {
  private previous: CpuTimes | null = null;

  /**
   * Sample CPU usage. Returns a percentage (0-100).
   *
   * The first call returns 0 since there is no previous sample
   * to calculate a delta. Subsequent calls return the delta.
   */
  sample(): number {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;

    for (const cpu of cpus) {
      idle += cpu.times.idle;
      total +=
        cpu.times.user +
        cpu.times.nice +
        cpu.times.sys +
        cpu.times.idle +
        cpu.times.irq;
    }

    const current: CpuTimes = { idle, total };

    if (!this.previous) {
      this.previous = current;
      return 0; // No delta on first sample
    }

    const idleDelta = current.idle - this.previous.idle;
    const totalDelta = current.total - this.previous.total;

    this.previous = current;

    if (totalDelta === 0) return 0;

    const usedDelta = totalDelta - idleDelta;
    const percentage = (usedDelta / totalDelta) * 100;

    return Math.round(percentage * 10) / 10;
  }

  /** Reset the baseline so the next sample starts fresh. */
  reset(): void {
    this.previous = null;
  }
}
