/**
 * The headline on the landing page's fines box.
 *
 * Client ask (2026-10, via Rob): replace the per-scheme breakdown with one
 * combined annual total, "TOLL FINES FOR 2025 OVER £450,000,000", flashing
 * every 3 seconds. Change the figure here and nowhere else.
 */
export const TOLL_FINES_YEAR = 2025;

/** The combined total, in pounds, shown as "OVER £450,000,000". */
export const TOLL_FINES_TOTAL_GBP = 450_000_000;

/** How often the figure pulses. */
export const TOLL_FINES_PULSE_MS = 3000;

/** The exact line shown in the box. */
export function tollFinesHeadline(): string {
  return `TOLL FINES FOR ${TOLL_FINES_YEAR} OVER £${TOLL_FINES_TOTAL_GBP.toLocaleString('en-GB')}`;
}
